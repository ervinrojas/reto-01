import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

import * as provTools from "./tools/proveedor";

const app = new Hono();
app.use("/*", cors());

app.get("/", async (c) => {
  try {
    const html = await fs.readFile(path.join(process.cwd(), "web/index.html"), "utf-8");
    return c.html(html);
  } catch (e) {
    return c.text("Error cargando HTML", 500);
  }
});

const openaiClient = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY 
});

const ctx = { directory: process.cwd(), sessionId: "server" };

const aiTools = {
  proveedor_leer_solicitud: tool({
    description: provTools.leer_solicitud.description,
    parameters: z.object({ caso: z.string() }),
    execute: async (args: any) => JSON.parse(await provTools.leer_solicitud.execute(args, ctx)),
  }),
  proveedor_mapear_campos: tool({
    description: provTools.mapear_campos.description,
    parameters: z.object({ caso: z.string(), campos_solicitados: z.any() }),
    execute: async (args: any) => JSON.parse(await provTools.mapear_campos.execute(args, ctx)),
  }),
  proveedor_generar_formulario: tool({
    description: provTools.generar_formulario.description,
    parameters: z.object({ caso: z.string(), mapeo: z.any() }),
    execute: async (args: any) => JSON.parse(await provTools.generar_formulario.execute(args, ctx)),
  }),
  proveedor_armar_paquete: tool({
    description: provTools.armar_paquete.description,
    parameters: z.object({ caso: z.string() }),
    execute: async (args: any) => JSON.parse(await provTools.armar_paquete.execute(args, ctx)),
  }),
};

app.post("/api/chat", async (c) => {
  const { message } = await c.req.json();
  console.log("📩 Mensaje recibido:", message);
  
  try {
    const promptText = await fs.readFile(path.join(process.cwd(), "agent/prompt.md"), "utf-8");
    
    console.log("⏳ Llamando a OpenAI...");
    const result = await generateText({
      model: openaiClient("gpt-4o-mini"),
      system: promptText,
      tools: aiTools,
      prompt: message,
      maxSteps: 10,
    });

    let reply = result.text;
    
    if (!reply) {
      reply = "🛠️ Resultados completos del Agente:\n\n" + JSON.stringify(result, null, 2);
    }

    console.log("✅ OpenAI respondió!");
    return c.json({ reply: reply });
  } catch (error: any) {
    console.error("❌ Error en agente:", error.message);
    return c.json({ reply: `Error del agente: ${error.message}` }, 500);
  }
});

const port = 3001;
console.log(`🚀 Servidor corriendo en http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
