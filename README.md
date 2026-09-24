# reto-01

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.4.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

Reto 01 - Agente Registro Proveedor
Cómo correrlo
Instalar Bun: https://bun.sh/
Instalar dependencias: bun install
Configurar API Key: Crear archivo .env con OPENAI_API_KEY=tu_clave
Comandos
Verificar herramientas (Sin LLM): bun run demo.ts
Iniciar agente conversacional: bun run src/server.ts (Ir a http://localhost:3001)
Estructura clave
src/tools/proveedor.ts: Lógica de negocio.
demo.ts: Verificación determinista.
out/: Archivos generados (Excel, soportes).
