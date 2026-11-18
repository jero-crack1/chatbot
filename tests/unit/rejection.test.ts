import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  classifyReturningContact,
  detectRejection,
  type RejectionReason,
  type ReturningContactAction,
} from "../../lib/whatsapp/rejection";

const optOut: [string, RejectionReason][] = [
  // Baja explícita
  ["STOP", "baja_explicita"],
  ["stop por favor", "baja_explicita"],
  ["Stop!!!", "baja_explicita"],
  ["Basta", "baja_explicita"],
  ["ya basta", "baja_explicita"],
  ["No más", "baja_explicita"],
  ["ya no mas por favor", "baja_explicita"],
  ["Salir", "baja_explicita"],
  ["🛑", "baja_explicita"],
  ["🚫🚫", "baja_explicita"],
  ["🙅‍♂️", "baja_explicita"],
  ["No me escriban más", "baja_explicita"],
  ["no me escribas", "baja_explicita"],
  ["NO ME ESCRIBAN", "baja_explicita"],
  ["Nooo me escribaaan", "baja_explicita"],
  ["Por favor no me escriba", "baja_explicita"],
  ["Nunca más me contacten", "baja_explicita"],
  ["no me contacten", "baja_explicita"],
  ["No me vuelvan a escribir", "baja_explicita"],
  ["no vuelvan a escribirme", "baja_explicita"],
  ["no me molesten", "baja_explicita"],
  ["No me molestes más", "baja_explicita"],
  ["no me jodan mas", "baja_explicita"],
  ["no me fastidien", "baja_explicita"],
  ["no insistan", "baja_explicita"],
  ["no me manden más mensajes", "baja_explicita"],
  ["no me envíen nada", "baja_explicita"],
  ["no me manden mas msj", "baja_explicita"],
  ["Deja de escribirme", "baja_explicita"],
  ["dejen de molestar", "baja_explicita"],
  ["ya dejen de escribir", "baja_explicita"],
  ["Déjenme en paz", "baja_explicita"],
  ["dejame tranquilo", "baja_explicita"],
  ["No quiero recibir más mensajes", "baja_explicita"],
  ["no quiero que me escriban", "baja_explicita"],
  ["no quiero que me sigan escribiendo", "baja_explicita"],
  ["no quiero mas publicidad", "baja_explicita"],
  ["Quiero darme de baja", "baja_explicita"],
  ["me doy de baja", "baja_explicita"],
  ["solicito la baja", "baja_explicita"],
  ["desuscribirme", "baja_explicita"],
  ["Sáquenme de la lista", "baja_explicita"],
  ["quítenme de su base de datos", "baja_explicita"],
  ["bórrenme de este grupo de difusión", "baja_explicita"],
  ["borren mi número", "baja_explicita"],
  ["eliminen mi contacto", "baja_explicita"],
  ["Yo no autorizo esto", "baja_explicita"],
  ["no di permiso para que me escribieran", "baja_explicita"],
  ["nunca les di mi número", "baja_explicita"],
  ["unsubscribe", "baja_explicita"],
  ["please don't text me", "baja_explicita"],
  ["leave me alone", "baja_explicita"],
  ["x favor no me escriban", "baja_explicita"],
  // Habeas data
  ["Exijo mi derecho de habeas data", "eliminacion_datos"],
  ["eliminen todos mis datos", "eliminacion_datos"],
  ["revoco la autorización", "eliminacion_datos"],
  // Número equivocado
  ["número equivocado", "numero_equivocado"],
  ["Se equivocaron de número", "numero_equivocado"],
  ["te equivocaste de persona", "numero_equivocado"],
  ["wrong number", "numero_equivocado"],
  ["no soy esa persona", "numero_equivocado"],
  ["No soy yo", "numero_equivocado"],
  ["no conozco a esa empresa", "numero_equivocado"],
  ["no sé quién es usted", "numero_equivocado"],
  ["yo no pedí nada", "numero_equivocado"],
  ["no me inscribí en nada", "numero_equivocado"],
  // Queja / spam
  ["Esto es spam", "queja_spam"],
  ["los voy a reportar", "queja_spam"],
  ["te bloqueo", "queja_spam"],
  ["voy a bloquearlos", "queja_spam"],
  ["voy a denunciar este número", "queja_spam"],
  ["¿De dónde sacaron mi número?", "queja_spam"],
  ["cómo consiguieron mi celular", "queja_spam"],
  ["quién les dio mi número?", "queja_spam"],
  ["me están acosando", "queja_spam"],
  ["queja ante la superintendencia", "queja_spam"],
  // Insultos
  ["váyanse a la mierda", "insulto"],
  ["vete al carajo", "insulto"],
  ["malparidos", "insulto"],
  ["idiotas", "insulto"],
  ["hp", "insulto"],
  // No interesado (mensajes cortos)
  ["No me interesa", "no_interesado"],
  ["no me interesa, gracias", "no_interesado"],
  ["No, gracias", "no_interesado"],
  ["no gracias 🙏", "no_interesado"],
  ["no estoy interesado", "no_interesado"],
  ["no estamos interesadas", "no_interesado"],
  ["sin interés", "no_interesado"],
  ["No lo necesito", "no_interesado"],
  ["no necesitamos nada", "no_interesado"],
  ["no quiero", "no_interesado"],
  ["ya tenemos proveedor", "no_interesado"],
  ["ya tengo quien me haga eso", "no_interesado"],
  ["no estoy buscando eso", "no_interesado"],
  ["paso", "no_interesado"],
  ["Olvídalo", "no_interesado"],
  ["ni de riesgos", "no_interesado"],
  ["para nada", "no_interesado"],
  ["ya no", "no_interesado"],
  ["que jartera", "no_interesado"],
  ["ustedes son muy intensos", "no_interesado"],
  ["not interested", "no_interesado"],
  ["ahora no me interesa", "no_interesado"],
  ["por ahora no, gracias", "no_interesado"],
];

const askAi: [string, RejectionReason][] = [
  // Ambiguos sueltos
  ["baja", "baja_explicita"],
  ["Cancelar", "baja_explicita"],
  ["alto", "baja_explicita"],
  // Rechazo con preferencia de canal
  ["no me escriba por aquí, mejor al correo", "baja_explicita"],
  // Mensajes largos con "no me interesa"
  [
    "no me interesa el plan básico pero quiero saber del premium y sus precios",
    "no_interesado",
  ],
  [
    "ya tenemos proveedor pero no estamos contentos, qué ofrecen ustedes distinto",
    "no_interesado",
  ],
  // Insulto dentro de un mensaje largo (en Colombia puede ser interjección)
  ["jueputa qué barato, eso es justo lo que necesitamos", "insulto"],
];

const pause = [
  "ahora no",
  "no es buen momento",
  "más adelante",
  "después te escribo",
  "lo voy a pensar",
  "déjame pensarlo",
  "hoy no puedo",
];

/** Trampas: deben ser "none" para no perder leads por falsos positivos. */
const none = [
  "no",
  "No.",
  "nop",
  "no, el martes no puedo",
  "no, mejor el jueves a las 3",
  "Hola, vi su anuncio",
  "Quiero información",
  "¿Cuánto cuesta?",
  "sí me interesa",
  "no sé si me interesa, cuéntame más",
  "no me molesta pagar más si es bueno",
  "no me contactaron ayer como prometieron",
  "no me escribieron el link de la reunión",
  "no me escribiste el precio",
  "dejé de escribirles porque estaba de viaje",
  "el presupuesto es alto",
  "la urgencia es baja, para el próximo trimestre",
  "estamos acostumbrados a otro proveedor",
  "no soy yo quien decide, es mi jefe",
  "no tengo el correo a la mano",
  "¡no me jodas! qué buen precio",
  "qué chimba",
  "le reporto a mi jefe y te aviso",
  "no me mande la cotización todavía, primero hablemos",
  "necesitamos bajar costos",
  "stopper de puerta", // palabra que empieza por stop
  "",
  "   ",
  "👍",
];

describe("detectRejection: rechazo claro (opt_out)", () => {
  for (const [text, reason] of optOut) {
    test(JSON.stringify(text), () => {
      const result = detectRejection(text);
      assert.equal(
        result.action,
        "opt_out",
        `resultado: ${JSON.stringify(result)}`
      );
      assert.equal("reason" in result && result.reason, reason);
    });
  }
});

describe("detectRejection: dudoso, decide la IA (ask_ai)", () => {
  for (const [text, reason] of askAi) {
    test(JSON.stringify(text), () => {
      const result = detectRejection(text);
      assert.equal(
        result.action,
        "ask_ai",
        `resultado: ${JSON.stringify(result)}`
      );
      assert.equal("reason" in result && result.reason, reason);
    });
  }
});

describe("detectRejection: aplaza (pause)", () => {
  for (const text of pause) {
    test(JSON.stringify(text), () => {
      const result = detectRejection(text);
      assert.equal(
        result.action,
        "pause",
        `resultado: ${JSON.stringify(result)}`
      );
    });
  }
});

describe("detectRejection: no es rechazo (none)", () => {
  for (const text of none) {
    test(JSON.stringify(text), () => {
      const result = detectRejection(text);
      assert.equal(
        result.action,
        "none",
        `resultado: ${JSON.stringify(result)}`
      );
    });
  }
});

describe("classifyReturningContact: contacto dado de baja que vuelve a escribir", () => {
  const cases: [string, ReturningContactAction][] = [
    // Interés en el producto: retoma para agendar
    ["ALTA", "reactivate"],
    ["start", "reactivate"],
    ["sí me interesa", "reactivate"],
    ["ya me interesa, cambié de opinión", "reactivate"],
    ["me arrepentí, cuéntame", "reactivate"],
    ["quiero agendar una cita", "reactivate"],
    ["quiero que me contacten", "reactivate"],
    ["me gustaría más información", "reactivate"],
    ["Hola, ¿cuánto cuesta?", "reactivate"],
    ["qué precio tiene el servicio", "reactivate"],
    ["me pasas una cotización?", "reactivate"],
    ["¿cómo funciona?", "reactivate"],
    ["¿qué servicios ofrecen?", "reactivate"],
    ["hola vi su anuncio en instagram", "reactivate"],
    ["¿tienen disponibilidad esta semana?", "reactivate"],
    ["podemos cuadrar una reunión", "reactivate"],
    ["¿cuándo podemos vernos?", "reactivate"],
    ["quiero contratar", "reactivate"],
    ["necesito una asesoría", "reactivate"],
    ["¿dónde quedan?", "reactivate"],
    // Vuelve a rechazar o se queja: silencio
    ["no me escriban", "stay_silent"],
    ["¿por qué me siguen escribiendo?", "stay_silent"],
    ["no quiero agendar", "stay_silent"],
    ["no necesito precios", "stay_silent"],
    ["no me interesa", "stay_silent"],
    ["ahora no", "stay_silent"],
    ["🛑", "stay_silent"],
    // Neutro: decide la IA con el historial
    ["hola", "ask_ai"],
    ["buenas tardes", "ask_ai"],
    ["ok", "ask_ai"],
    ["?", "ask_ai"],
    ["no sé si me interesa", "ask_ai"],
    ["baja", "ask_ai"],
  ];
  for (const [text, expected] of cases) {
    test(`${JSON.stringify(text)} → ${expected}`, () => {
      assert.equal(classifyReturningContact(text), expected);
    });
  }
});
