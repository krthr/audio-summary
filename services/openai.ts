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
): Promise<string | undefined> {
  try {
    const model = Env.get("WHISPER_MODEL", "whisper-1");

    Logger.info({ fileName, model }, "createTranscription");

    const form = new FormData();
    form.append("model", model);
    form.append("file", file, fileName);

    const response = await client.post("/audio/transcriptions", form);
    return response.data.text;
  } catch (error) {
    Logger.error({ fileName }, error);
    return undefined;
  }
}

export async function createSummary(text: string) {
  try {
    const model = Env.get("GPT_MODEL", "gpt-3.5-turbo");
    Logger.info({ length: text.length, model }, "createSummary");

    const response = await client.post("/chat/completions", {
      model,
      messages: [
        {
          role: "user",
          content:
            "Analiza el siguiente texto y devuelve el tema del texto, " +
            "el resumen en no más de 5 frases, " +
            "el sentimiento del texto (NEGATIVO, POSITIVO, NEUTRO) " +
            "y etiquetas separadas por coma. " +
            "La respuesta debe ser un JSON con las siguientes llaves: TEMA,RESUMEN,SENTIMIENTO,ETIQUETAS." +
            "\n\n" +
            text.trim(),
        },
      ],
    });

    return response.data.choices[0]?.message?.content?.trim();
  } catch (error) {
    Logger.error({ text }, error);
    return undefined;
  }
}
