import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Logger from "@ioc:Adonis/Core/Logger";
import Redis from "@ioc:Adonis/Addons/Redis";
import { createSummary, createTranscription } from "../../../services/openai";
import { readFile } from "node:fs/promises";

export default class CallsController {
  public async index({ view }: HttpContextContract) {
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

    try {
      const fileName = audio.clientName;
      const file = await readFile(audio.tmpPath!);
      const text = await createTranscription(file, fileName);
      const summary = await createSummary(text);
      const id = Math.random().toString(36).slice(2, 7);

      const payload = {
        id,
        text,
        summary,
        fileName,
      };

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
