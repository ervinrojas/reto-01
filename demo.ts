import { leer_solicitud, mapear_campos, generar_formulario, armar_paquete } from "./src/tools/proveedor";

const ctx = { directory:process.cwd(), sessionId: "demo" };

async function runDemo() {
  console.log("--- INICIO DEMO RETO 01 ---");
  
  try {
    const caso = "co-industrias-delta"; 
    console.log(`Leyendo caso: ${caso}...`);
    
    // 1. Leer
    const solRes = await leer_solicitud.execute({ caso }, ctx);
    const solData = JSON.parse(solRes);
    if (!solData.ok) throw new Error(solData.error);
    console.log("✅ Formato:", solData.data?.solicitud?.formato);

    // 2. Mapear
    const campos = solData.data.plantilla.map((p: any) => ({ etiqueta: p.etiqueta }));
    const mapRes = await mapear_campos.execute({ caso, campos_solicitados: campos }, ctx);
    const mapData = JSON.parse(mapRes);
    if (!mapData.ok) throw new Error(mapData.error);
    console.log(`✅ Mapeo: ${mapData.data.llenos.length} llenos, ${mapData.data.faltantes.length} faltantes`);

    // 3. Generar Excel
    const genRes = await generar_formulario.execute({ caso, mapeo: mapData.data }, ctx);
    const genData = JSON.parse(genRes);
    if (!genData.ok) throw new Error(genData.error);
    console.log("✅ Excel generado en:", genData.data.ruta);

    // 4. Armar Paquete
    const packRes = await armar_paquete.execute({ caso }, ctx);
    const packData = JSON.parse(packRes);
    if (!packData.ok) throw new Error(packData.error);
    console.log("✅ Paquete listo para firma?", packData.data.listo_para_firma);
    console.log("📋 Checklist:", packData.data.checklist);

  } catch (error: any) {
    console.error("💥 Error:", error.message);
  }
}

runDemo();