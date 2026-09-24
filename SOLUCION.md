Solución Reto 01
1. Problema
Transcripción manual de datos de maestros a formularios de clientes, generando retrabajo y riesgo de error en datos sensibles.

2. Arquitectura
Herramientas (Core): src/tools/proveedor.ts - Lógica pura en TypeScript para leer, mapear, generar y armar.
Agente/LLM: src/server.ts - Ciclo de agente usando Vercel AI SDK y OpenAI (gpt-4o-mini).
Frontend: web/index.html - Chat vanilla JS.
Demo: demo.ts - Ejecución directa de herramientas sin LLM.
3. Ciclo del agente
Usé Vercel AI SDK (generateText) con maxSteps: 5. El LLM decide llamar herramientas en orden: Leer -> Mapear -> Generar -> Armar.

4. Elección del modelo
OpenAI gpt-4o-mini: Rápido, barato y excelente siguiendo instrucciones de herramientas (function calling).

5. Decisiones y trade-offs
ExcelJS vs Copia de plantilla: Elegí generar el Excel desde 0 con ExcelJS basado en plantilla-celdas.json en lugar de manipular un archivo binario existente para garantizar el control de las celdas.
PDF (P1): Omitido por tiempo. Se asume que se generaría un PDF simple o un markdown con los campos.
Frontend Vanilla: No usé React para evitar tiempos de build y asegurarme de levantar en 1 segundo.
6. Supuestos
Los fixtures representan la realidad.
El glosario cubre el 100% de las variaciones de campos de los clientes actuales.
7. Cobertura
HU	Estado	Notas
HU-1 Leer	Hecho	leer_solicitud funcional
HU-2 Mapear	Hecho	mapear_campos funcional con glosario y reglas país
HU-3 Generar	Parcial	Excel (P0) hecho. PDF (P1) pendiente.
HU-4 Paquete	Hecho	armar_paquete copia soportes y evalúa vigencias
HU-5 Errores	Hecho	Herramientas devuelven { ok: false, error }
8. Uso de IA
Usé ChatGPT/Copilot para generar boilerplate de Hono y Zod schemas.