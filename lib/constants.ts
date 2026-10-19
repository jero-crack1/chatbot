import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

export const suggestions = [
  "Hola, me gustaría información sobre sus soluciones B2B",
  "Queremos mejorar la captación y conversión de clientes este mes",
  "¿Cómo funciona la integración para equipos de ventas?",
  "Necesito agendar una llamada estratégica con un especialista",
];
