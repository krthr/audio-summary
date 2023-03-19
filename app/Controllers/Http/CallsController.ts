import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Redis from "@ioc:Adonis/Addons/Redis";
import StoreCallValidator from "App/Validators/StoreCallValidator";
import { createSummary, createTranscription } from "../../../services/openai";
import { readFile } from "node:fs/promises";

export default class CallsController {
  public async index({ view }: HttpContextContract) {
    return view.render("create");
  }

  public async store({ request, response }: HttpContextContract) {
    const body = await request.validate(StoreCallValidator);

    try {
      const fileName = body.audio.clientName;
      const file = await readFile(body.audio.tmpPath!);
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
      console.error(error.response.data);
      return response.internalServerError(error);
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
