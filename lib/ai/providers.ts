import { customProvider, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { isTestEnvironment } from "../constants";
import { chatModel as mockChatModel, titleModel as mockTitleModel } from "./models.mock";

export const myProvider = customProvider({
  languageModels: {
    "chat-model": mockChatModel,
    "title-model": mockTitleModel,
  },
});

const retryGeminiUnavailableOnce: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status !== 503) return response;

  await response.body?.cancel().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return fetch(input, init);
};

function createGeminiProvider(apiKey?: string) {
  return createGoogleGenerativeAI({
    apiKey,
    fetch: retryGeminiUnavailableOnce,
  });
}

export function getLanguageModel(modelId: string): LanguageModel {
  if (isTestEnvironment) {
    return myProvider.languageModel(modelId);
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const google = createGeminiProvider(apiKey);
    return google("gemini-3.8-flash") as unknown as LanguageModel;
  }

  // Fallback: LeadFlow Agent Modo Autónomo Local (100% Gratis, Zero-Config)
  return myProvider.languageModel("chat-model");
}

export function getTitleModel(): LanguageModel {
  if (isTestEnvironment) {
    return myProvider.languageModel("title-model");
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const google = createGeminiProvider(apiKey);
    return google("gemini-3.8-flash") as unknown as LanguageModel;
  }

  return myProvider.languageModel("title-model");
}
