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
          "Resume en no más de 5 frases el siguiente texto y " +
          "también obtén el sentimiento del usuario. Muestra el " +
          "sentimiento con una sola palabra (los únicos valores " +
          "posibles para el sentimiento son: positivo, negativo o neutral). " +
          "No expliques el sentimiento. Muestra los resultados en dos " +
          "párrafos: uno para el resumen y el otro para el sentimiento. " +
          "Agrega el título a cada párrafo: \n\n" +
          text.trim(),
      },
    ],
  });

  return response.data.choices[0]?.message?.content;
}
