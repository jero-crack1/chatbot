import type { LanguageModel } from "ai";

const mockResponses: Record<string, string> = {
  default:
    "Comprendo perfectamente la necesidad de tu empresa. En LeadFlow ayudamos a negocios B2B a calificar y cerrar prospectos de alto valor. ¿Te gustaría que agendemos una llamada estratégica de 15 minutos o prefieres dejarme tus datos?",
  greeting:
    "¡Hola! Soy LeadFlow Agent, tu ejecutivo de ventas digital B2B. ¿Cuál es el principal desafío de captación o conversión que busca resolver tu empresa hoy?",
  meeting:
    "Excelente, tu empresa califica para una sesión estratégica personalizada. He procedido a coordinar los detalles para nuestra llamada.",
  lead:
    "Perfecto, he registrado los datos de tu empresa en nuestro CRM. Nuestro equipo comercial se comunicará contigo a la brevedad con la información requerida.",
  weather:
    "El clima en la ubicación solicitada es favorable para cerrar buenos negocios.",
};

const mockUsage = {
  inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 10, total: 10 },
  outputTokens: { reasoning: 0, text: 20, total: 20 },
};

function getLastUserMessage(prompt: unknown): string {
  if (Array.isArray(prompt)) {
    for (let i = prompt.length - 1; i >= 0; i--) {
      const msg = prompt[i];
      if (msg && (msg.role === "user" || msg.type === "user")) {
        if (typeof msg.content === "string") return msg.content;
        if (Array.isArray(msg.content)) {
          return msg.content
            .map((c: any) => (typeof c === "string" ? c : c.text ?? ""))
            .join(" ");
        }
      }
    }
  }
  if (prompt && typeof prompt === "object") {
    const p = prompt as Record<string, any>;
    if (Array.isArray(p.messages)) {
      for (let i = p.messages.length - 1; i >= 0; i--) {
        const msg = p.messages[i];
        if (msg && msg.role === "user") {
          if (typeof msg.content === "string") return msg.content;
          if (Array.isArray(msg.content)) {
            return msg.content
              .map((c: any) => (typeof c === "string" ? c : c.text ?? ""))
              .join(" ");
          }
        }
      }
    }
  }
  return "";
}

function getResponseForPrompt(prompt: unknown): string {
  const userText = getLastUserMessage(prompt).toLowerCase();

  if (
    userText.includes("hola") ||
    userText.includes("buenas") ||
    userText.includes("buenos") ||
    userText.includes("hi") ||
    userText.includes("hey")
  ) {
    return mockResponses.greeting;
  }

  if (
    userText.includes("agend") ||
    userText.includes("reun") ||
    userText.includes("llamada") ||
    userText.includes("cita") ||
    userText.includes("demo")
  ) {
    return mockResponses.meeting;
  }

  if (
    userText.includes("correo") ||
    userText.includes("email") ||
    userText.includes("@") ||
    userText.includes("contacto") ||
    userText.includes("telefono")
  ) {
    return mockResponses.lead;
  }

  if (userText.includes("clima") || userText.includes("weather")) {
    return mockResponses.weather;
  }

  return mockResponses.default;
}

const createMockModel = (): LanguageModel =>
  ({
    defaultObjectGenerationMode: "tool",
    doGenerate: async ({ prompt }: { prompt: unknown }) => ({
      content: [{ text: getResponseForPrompt(prompt), type: "text" }],
      finishReason: "stop",
      usage: mockUsage,
      warnings: [],
    }),
    doStream: ({ prompt }: { prompt: unknown }) => {
      const response = getResponseForPrompt(prompt);
      const words = response.split(" ");

      return {
        stream: new ReadableStream({
          async start(controller) {
            controller.enqueue({ id: "t1", type: "text-start" });
            await words.reduce<Promise<void>>(async (previous, word) => {
              await previous;
              controller.enqueue({
                delta: `${word} `,
                id: "t1",
                type: "text-delta",
              });
              await new Promise((resolve) => {
                setTimeout(resolve, 10);
              });
            }, Promise.resolve());
            controller.enqueue({ id: "t1", type: "text-end" });
            controller.enqueue({
              finishReason: "stop",
              type: "finish",
              usage: mockUsage,
            });
            controller.close();
          },
        }),
      };
    },
    modelId: "mock-model",
    provider: "mock",
    specificationVersion: "v3",
    supportedUrls: {},
  }) as unknown as LanguageModel;

const createMockTitleModel = (): LanguageModel =>
  ({
    defaultObjectGenerationMode: "tool",
    doGenerate: async () => ({
      content: [{ text: "Test Conversation", type: "text" }],
      finishReason: "stop",
      usage: {
        inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 5, total: 5 },
        outputTokens: { reasoning: 0, text: 5, total: 5 },
      },
      warnings: [],
    }),
    doStream: () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ id: "t1", type: "text-start" });
          controller.enqueue({
            delta: "Test Conversation",
            id: "t1",
            type: "text-delta",
          });
          controller.enqueue({ id: "t1", type: "text-end" });
          controller.enqueue({
            finishReason: "stop",
            type: "finish",
            usage: {
              inputTokens: {
                cacheRead: 0,
                cacheWrite: 0,
                noCache: 5,
                total: 5,
              },
              outputTokens: { reasoning: 0, text: 5, total: 5 },
            },
          });
          controller.close();
        },
      }),
    }),
    modelId: "mock-title-model",
    provider: "mock",
    specificationVersion: "v3",
    supportedUrls: {},
  }) as unknown as LanguageModel;

export const chatModel = createMockModel();
export const titleModel = createMockTitleModel();
