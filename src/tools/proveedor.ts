import { z } from "zod";
import { resolve } from "path";
import * as ExcelJS from "exceljs";
import { promises as fs } from "fs"; 

// Helper rápido para leer JSON con Bun
async function readJson(path: string) {
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`Archivo no encontrado: ${path}`);
  return await file.json();
}

// 1. LEER SOLICITUD
export const leer_solicitud = {
  description: "Lee la solicitud de registro y la plantilla de un caso específico.",
  args: { caso: z.string().describe("Nombre de la carpeta del caso en fixtures/reto-01/casos/") },
  async execute(args: { caso: string }, ctx: { directory: string }) {
    try {
      const basePath = resolve(ctx.directory, "fixtures/reto-01/casos", args.caso);
      const solicitud = await readJson(`${basePath}/solicitud.json`);
      
      // Determinar qué plantilla leer basado en el formato
      let plantilla;
      if (solicitud.formato === 'xlsx') {
        plantilla = await readJson(`${basePath}/plantilla-celdas.json`);
      } else if (solicitud.formato === 'pdf') {
        plantilla = await readJson(`${basePath}/plantilla-campos.json`);
      }

      return JSON.stringify({ ok: true, data: { solicitud, plantilla } });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: e.message });
    }
  }
};

// 2. MAPEAR CAMPOS
export const mapear_campos = {
  description: "Cruza los campos de la plantilla con el maestro y el glosario de sinónimos.",
  args: { 
    caso: z.string(),
    campos_solicitados: z.array(z.object({ etiqueta: z.string() }))
  },
  async execute(args: { caso: string, campos_solicitados: any[] }, ctx: { directory: string }) {
    try {
      const dir = ctx.directory;
      const maestro = await readJson(resolve(dir, "fixtures/reto-01/repositorio/maestro.json"));
      const glosario = await readJson(resolve(dir, "fixtures/reto-01/glosario-campos.json"));
      const solicitud = await readJson(resolve(dir, "fixtures/reto-01/casos", args.caso, "solicitud.json"));

      const llenos: any[] = [];
      const faltantes: any[] = [];
      const requiere_confirmacion: any[] = [];

      for (const campo of args.campos_solicitados) {
        const etiqueta = campo.etiqueta;
        // Buscar en glosario o usar la etiqueta directa
        const claveMaestro = glosario[etiqueta] || etiqueta.toLowerCase().replace(/ /g, "_");
        const valor = maestro[claveMaestro];

        if (valor !== undefined) {
          // Regla RN1: Identificador tributario extranjero
          if (claveMaestro.includes("nit") && solicitud.pais !== "CO") {
            requiere_confirmacion.push({ etiqueta, valor, motivo: "Identificador extranjero, verificar para " + solicitud.pais });
          } else {
            llenos.push({ etiqueta, valor, clave: claveMaestro });
          }
        } else {
          faltantes.push({ etiqueta, motivo: "No existe en maestro ni glosario" });
        }
      }

      return JSON.stringify({ ok: true, data: { llenos, faltantes, requiere_confirmacion } });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: e.message });
    }
  }
};

// 3. GENERAR FORMULARIO
export const generar_formulario = {
  description: "Genera el archivo Excel con los campos mapeados en las celdas correctas.",
  args: { 
    caso: z.string(),
    mapeo: z.object({ llenos: z.array(z.any()), faltantes: z.array(z.any()) })
  },
  async execute(args: { caso: string, mapeo: any }, ctx: { directory: string }) {
    try {
      const outDir = resolve(ctx.directory, "out", args.caso);
      await fs.mkdir(outDir, { recursive: true });

      const basePath = resolve(ctx.directory, "fixtures/reto-01/casos", args.caso);
      const plantilla = await readJson(`${basePath}/plantilla-celdas.json`);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Formulario");

      // Escribir campos llenos
      for (const lleno of args.mapeo.llenos) {
        const celdaInfo = plantilla.find((p: any) => p.etiqueta === lleno.etiqueta);
        if (celdaInfo) {
          worksheet.getCell(celdaInfo.celda_etiqueta).value = lleno.etiqueta;
          worksheet.getCell(celdaInfo.celda_valor).value = lleno.valor;
        }
      }
      // Marcar faltantes
      for (const faltante of args.mapeo.faltantes) {
        const celdaInfo = plantilla.find((p: any) => p.etiqueta === faltante.etiqueta);
        if (celdaInfo) {
          worksheet.getCell(celdaInfo.celda_etiqueta).value = faltante.etiqueta;
          worksheet.getCell(celdaInfo.celda_valor).value = "FALTANTE";
        }
      }

      const rutaExcel = resolve(outDir, "formulario.xlsx");
      await workbook.xlsx.writeFile(rutaExcel);

      return JSON.stringify({ ok: true, data: { ruta: rutaExcel, formato: "xlsx" } });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: e.message });
    }
  }
};

// 4. ARMAR PAQUETE
export const armar_paquete = {
  description: "Arma la carpeta paquete con el formulario, soportes y borrador de correo.",
  args: { caso: z.string() },
  async execute(args: { caso: string }, ctx: { directory: string }) {
    try {
      const outDir = resolve(ctx.directory, "out", args.caso, "paquete");
      await fs.mkdir(outDir, { recursive: true });

      // Copiar formulario si existe
      const formOrigen = resolve(ctx.directory, "out", args.caso, "formulario.xlsx");
      if ((await fs.access(formOrigen).then(() => true).catch(() => false))) {
        await fs.copyFile(formOrigen, resolve(outDir, "formulario.xlsx"));
      }

      // Leer soportes exigidos y disponibles
      const basePath = resolve(ctx.directory, "fixtures/reto-01/casos", args.caso);
      const exigidos = await readJson(`${basePath}/soportes-exigidos.json`);
      const indexSoportes = await readJson(resolve(ctx.directory, "fixtures/reto-01/repositorio/soportes/index.json"));

      let listoParaFirma = true;
      const checklist: string[] = [];

      for (const exigido of exigidos) {
        const disponible = indexSoportes.find((s: any) => s.tipo === exigido);
        if (disponible) {
          const origen = resolve(ctx.directory, "fixtures/reto-01/repositorio/soportes", disponible.archivo);
          await fs.copyFile(origen, resolve(outDir, disponible.archivo));
          
          const vencido = new Date(disponible.vigencia_hasta) < new Date();
          if (vencido) { listoParaFirma = false; checklist.push(`❌ ${exigido} (Vencido)`); }
          else { checklist.push(`✅ ${exigido}`); }
        } else {
          listoParaFirma = false;
          checklist.push(`⚠️ ${exigido} (Ausente)`);
        }
      }

      // Crear borrador correo
      await fs.writeFile(resolve(outDir, "borrador-correo.md"), `Adjunto formulario de registro para firma.\n\nSoportes:\n${checklist.join('\n')}`);

      return JSON.stringify({ ok: true, data: { ruta: outDir, listo_para_firma: listoParaFirma, checklist } });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: e.message });
    }
  }
};

// 5. SIMULAR ENVIO
export const simular_envio = {
  description: "Simula el envío del paquete al cliente. Requiere confirmación explícita.",
  args: { 
    caso: z.string(),
    confirmado: z.boolean().describe("Debe ser true para confirmar el envío")
  },
  async execute(args: { caso: string, confirmado: boolean }, ctx: { directory: string }) {
    if (!args.confirmado) {
      return JSON.stringify({ ok: false, error: "Requiere confirmación explícita del usuario para enviar." });
    }
    
    try {
      const outDir = resolve(ctx.directory, "out", args.caso);
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(resolve(outDir, "ENVIO-SIMULADO.md"), `Envío simulado para ${args.caso} el ${new Date().toISOString()}`);
      return JSON.stringify({ ok: true, data: { mensaje: "Paquete enviado (simulado) exitosamente." } });
    } catch (e: any) {
      return JSON.stringify({ ok: false, error: e.message });
    }
  }
};