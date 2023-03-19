import Axios from "axios";
import Env from "@ioc:Adonis/Core/Env";
import FormData from "form-data";
import Logger from "@ioc:Adonis/Core/Logger";

const apiKey = Env.get("OPENAI_API_KEY");

const client = Axios.create({
  baseURL: "https://api.openai.com/v1",
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

export async function createTranscription(
  file: Buffer,
  fileName: string
): Promise<string> {
  Logger.info({ fileName }, "createTranscription");

  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("file", file, fileName);

  const response = await client.post("/audio/transcriptions", form);
  return response.data.text;
}

export async function createSummary(text: string) {
  Logger.info({ length: text.length }, "createSummary");

  const response = await client.post("/chat/completions", {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content:
          "Generar: " +
          "1. Tema del texto \n" +
          "2. Resumen con no más de 5 frases \n" +
          "3. Sentimiento del texto (NEGATIVO, POSITIVO, NEUTRO) \n" +
          "4. Etiquetas separadas por coma" +
          "\n\n" +
          text.trim(),
      },
    ],
  });

  return response.data.choices[0]?.message?.content?.trim();
}
