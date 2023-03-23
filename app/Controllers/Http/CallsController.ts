import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Logger from "@ioc:Adonis/Core/Logger";
import Redis from "@ioc:Adonis/Addons/Redis";
import { createSummary, createTranscription } from "../../../services/openai";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

export default class CallsController {
  public index({ view }: HttpContextContract) {
    return view.render("create");
  }

  public async store({ request, response, view }: HttpContextContract) {
    const audio = request.file("audio", {
      extnames: ["m4a", "mp3", "webm", "mp4", "mpga", "wav", "mpeg"],
      size: "25mb",
    });

    if (!audio) {
      Logger.error("archivo no se ha enviado");

      return view.render("create", {
        error: "No se ha enviado archivo.",
      });
    }

    if (!audio.isValid) {
      Logger.error(
        {
          extnames: audio.extname,
          size: audio.size,
        },
        "archivo inválido"
      );

      return view.render("create", {
        error:
          "Archivo inválido. Debe ser: m4a, mp3, webm, mp4, mpga, wav o mpeg y pesar máx. 25MB",
      });
    }

    const fileName = audio.clientName;
    const file = await readFile(audio.tmpPath!);

    const text = await createTranscription(file, fileName);
    if (!text) {
      return view.render("create", {
        error: "No se pudo extraer ninguna transcripción del audio.",
      });
    }

    const rawJsonSummary = await createSummary(text);
    if (!rawJsonSummary) {
      return view.render("create", {
        error:
          "Ha ocurrido un error al extraer información de la transcripción.",
      });
    }

    let json;
    try {
      json = JSON.parse(rawJsonSummary);
    } catch (error) {
      Logger.error({ rawJsonSummary }, error);

      return view.render("create", {
        error:
          "Ha ocurrido un error al extraer información de la transcripción.",
      });
    }

    const {
      TEMA: topic,
      RESUMEN: summary,
      SENTIMIENTO: sentiment,
      ETIQUETAS: tags,
    } = json;

    const id = randomBytes(5).toString("hex");
    const createdAt = new Date();

    const createdAtFormat = Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(createdAt);

    const payload = {
      id,
      text,
      topic,
      summary,
      sentiment,
      tags,
      fileName,
      createdAt,
      createdAtFormat,
    };

    try {
      await Redis.setex(`calls/${id}`, 60 * 60 * 24, JSON.stringify(payload));
      return response.redirect(`/${id}`);
    } catch (error) {
      Logger.error(error);

      return view.render("create", {
        error: error.message,
      });
    }
  }

  public async show({ request, response, view }: HttpContextContract) {
    const id = request.param("id");
    const call = await Redis.get(`calls/${id}`);

    if (!call) {
      return response.notFound();
    }

    const json = JSON.parse(call);
    return view.render("view", json);
  }
}
