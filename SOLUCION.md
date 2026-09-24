Solución Reto 01 — Agente Conversacional "Registro como Proveedor"
1. Problema en una frase
Transcripción manual y repetitiva de datos maestros a formularios de clientes, generando errores y dependencia de una persona.

2. Arquitectura
Front (Vanilla HTML/JS) → Backend (Hono/Bun) → Vercel AI SDK → OpenAI (gpt-4o-mini) → Herramientas (TS/Zod) → File System (Fixtures/Out).

3. Ciclo del agente
Implementado con generateText de Vercel AI SDK. El modelo decide qué herramienta llamar basado en el prompt. Límite de iteraciones (maxSteps=10) para evitar loops. Confirmación humana implementada en herramienta simular_envio.

4. Elección del modelo
gpt-4o-mini: Rápido, barato ($0.15/1M tokens input) y excelente siguiendo instrucciones de function calling.

5. Diseño del portal web (Sección 7.4)
Para portales web con login, se usaría Playwright o Puppeteer controlado por el agente. El agente se encargaría de navegar y llenar campos, pero el ingreso de credenciales y el clic final de "Enviar" quedan en manos humanas por seguridad (CAPTCHA/MFA). Las credenciales vivirían en un vault (Azure Key Vault) inyectado por variable de entorno, jamás en el prompt.

6. Decisiones y trade-offs
ExcelJS vs Manipulación binaria: Generé el Excel desde 0 basado en plantilla-celdas.json en lugar de modificar un template existente. Alternativa descartada: Librerías que modifican buffers de Excel son frágiles ante cambios de formato.
Frontend Vanilla vs React: Elegí HTML plano para cumplir el requisito de "arranque < 2 mins" sin configuración de build. Alternativa descartada: Next.js (demasiado overhead para un agente de consola).
Mapeo por glosario vs IA semántica: Uso un JSON de sinónimos estático (glosario-campos.json) en lugar de pedirle al LLM que adivine el mapeo. Alternativa descartada: Mapeo por embeddings (más flexible pero propenso a alucinaciones en datos críticos).
7. Supuestos
El glosario cubre el 100% de las variaciones de campos actuales.
Los soportes en el repositorio están actualizados (la vigencia se calcula al momento de armar el paquete).
8. Cobertura
HU	Estado	Qué falta para producción
HU-1 Leer	Hecho	-
HU-2 Mapear	Hecho	Soportar variaciones de países no listados
HU-3 Generar	Parcial	Falta PDF (P1), solo se implementó Excel (P0)
HU-4 Paquete	Hecho	Integración real con SharePoint
HU-5 Errores	Hecho	Logging más estructurado
9. Uso de IA
Usé ChatGPT (GPT-4) para generar boilerplate de Hono server y los esquemas Zod. Descarté sugerencias de usar LangChain porque Vercel AI SDK es más ligero y tipado para Bun.

10. Riesgos
Plantillas no mapeadas: Clientes nuevos con formatos raros romperán el mapeo. Mitigación: Reporte de faltantes explícito.
Soportes vencidos: El proceso se bloquea si algo venció. Mitigación: Alertas proactivas semanales.