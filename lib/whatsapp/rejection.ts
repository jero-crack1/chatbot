/**
 * Detecta rechazos en mensajes entrantes de WhatsApp, sin IA y de forma determinista.
 *
 * Acciones:
 * - "opt_out": rechazo claro. Se marca el contacto y no se le vuelve a escribir.
 * - "ask_ai":  posible rechazo, pero depende del contexto (mensaje largo o palabra
 *              ambigua como "baja" o "cancelar"). La IA decide con la conversación
 *              completa y puede llamar a la herramienta opt_out.
 * - "pause":   aplaza ("ahora no", "más adelante"). No se envían seguimientos
 *              automáticos, pero la IA sí responde a lo que escribió.
 * - "none":    no es un rechazo.
 *
 * Criterio: ante la duda entre perder un lead o escribirle a alguien que no quiere,
 * se prefiere no escribir. Pero respuestas normales como "no" a "¿te sirve el martes?"
 * NO son rechazo, por eso "no" solo no cuenta.
 */

export type RejectionReason =
  | "baja_explicita"
  | "no_interesado"
  | "numero_equivocado"
  | "queja_spam"
  | "eliminacion_datos"
  | "insulto";

export type RejectionResult =
  | { action: "none" }
  | { action: "pause"; matched: string }
  | { action: "ask_ai"; reason: RejectionReason; matched: string }
  | { action: "opt_out"; reason: RejectionReason; matched: string };

/** Mensajes "no me interesa" de hasta este número de palabras se toman como rechazo directo. */
const SHORT_MESSAGE_WORDS = 8;
/** Mensajes con insultos de hasta este número de palabras se toman como rechazo directo. */
const SHORT_INSULT_WORDS = 4;

const ABBREVIATIONS: Record<string, string> = {
  cel: "celular",
  info: "informacion",
  k: "que",
  ke: "que",
  mensaje: "mensajes",
  mjs: "mensajes",
  msj: "mensajes",
  msjs: "mensajes",
  nd: "nada",
  nro: "numero",
  num: "numero",
  plis: "por favor",
  pls: "por favor",
  porfa: "por favor",
  porfis: "por favor",
  porq: "porque",
  pq: "porque",
  q: "que",
  sms: "mensajes",
  tel: "telefono",
  ud: "usted",
  uds: "ustedes",
  wasap: "whatsapp",
  whats: "whatsapp",
  wpp: "whatsapp",
  wsp: "whatsapp",
  x: "por",
  xfa: "por favor",
  xfavor: "por favor",
  xq: "porque",
};

/** Minúsculas, sin tildes ni signos, letras repetidas colapsadas ("nooo" → "no") y abreviaturas expandidas. */
export function normalizeMessage(text: string): string {
  const cleaned = text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/(\p{L})\1{2,}/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return "";
  }
  return cleaned
    .split(" ")
    .map((word) => ABBREVIATIONS[word] ?? word)
    .join(" ");
}

const STOP_EMOJI_CHARS = new Set([
  "🛑",
  "🚫",
  "⛔",
  "✋",
  "🤚",
  "🙅",
  "‍",
  "️",
  "♀",
  "♂",
]);

function isOnlyStopEmojis(raw: string): boolean {
  const chars = Array.from(raw.replace(/\s+/g, ""));
  const hasStop = chars.some(
    (c) => STOP_EMOJI_CHARS.has(c) && !["‍", "️", "♀", "♂"].includes(c)
  );
  return (
    hasStop &&
    chars.every((c) => STOP_EMOJI_CHARS.has(c) || /\p{Emoji_Modifier}/u.test(c))
  );
}

type Rule = { re: RegExp; reason: RejectionReason };

/** Mensajes completos que son rechazo sin importar el contexto. */
const EXACT_OPT_OUT = new Set([
  "stop",
  "parar",
  "pare",
  "paren",
  "parele",
  "basta",
  "ya basta",
  "no mas",
  "ya no mas",
  "salir",
  "fin",
  "unsubscribe",
  "eliminar",
  "borrar",
  "end",
  "quit",
  "remove",
  "cancelar suscripcion",
  "no molestar",
  "no molesten",
  "no joda mas",
]);

/**
 * Mensajes completos ambiguos: "baja" puede responder "¿urgencia alta o baja?",
 * "cancelar" puede referirse a la cita, "alto" al presupuesto.
 */
const EXACT_ASK_AI = new Set([
  "baja",
  "de baja",
  "cancelar",
  "cancela",
  "cancelo",
  "cancelado",
  "alto",
  "para",
]);

/** Mensajes completos de "no me interesa". */
const EXACT_NOT_INTERESTED = new Set([
  "paso",
  "yo paso",
  "olvidalo",
  "olvidelo",
  "olvidenlo",
  "dejalo asi",
  "dejelo asi",
  "dejemoslo asi",
  "dejemos asi",
  "no quiero nada",
  "ni loco",
  "ni loca",
  "ni de riesgos",
  "ni de fundas",
  "ni por el putas",
  "para nada",
  "en absoluto",
  "no interesa",
  "nada que ver",
  "ya no",
  "no es para mi",
  "no aplica",
  "no gracias",
  "no thanks",
  "no thank you",
  "not interested",
]);

/** Rechazos claros en cualquier parte del mensaje. */
const HARD_RULES: Rule[] = [
  // "no me escriban", "nunca más me contacten", "no me vuelvan a escribir"
  {
    re: /\b(no|nunca|jamas)\s+(mas\s+)?(me|nos)\s+(vuelv(a|an|as|e)\s+a\s+)?(escrib(a|as|an|ir|irme|irnos)|contact(e|es|en|ar|arme|arnos)|molest(e|es|en|ar|arme|arnos)|fastidi(e|es|en|ar|arme)|insist(a|as|an|ir)|busqu(e|es|en))\b/,
    reason: "baja_explicita",
  },
  // "no me jodan más" ("¡no me jodas!" solo suele ser sorpresa, por eso exige "más")
  { re: /\bno\s+(me|nos)\s+jod(a|as|an)\s+mas\b/, reason: "baja_explicita" },
  // "no vuelvan a escribirme"
  {
    re: /\b(no|nunca|jamas)\s+(me\s+|nos\s+)?vuelv(a|an|as|e)\s+a\s+(escribir|contactar|molestar|llamar|mandar|enviar|buscar)(me|nos)?\b/,
    reason: "baja_explicita",
  },
  // "no me manden más", "no me envíen nada"
  {
    re: /\b(no|nunca|jamas)\s+(mas\s+)?(me|nos)\s+(mand|envi)(e|es|en|ar)\s+(mas|nada|mensajes|publicidad|promociones|informacion|spam|cosas|eso|esto)\b/,
    reason: "baja_explicita",
  },
  // "deja de escribirme", "dejen de molestar" (no "dejé de escribirles")
  {
    re: /\bdej(a|e|en|ar)\s+(ya\s+)?de\s+(escribir|contactar|molestar|fastidiar|joder|insistir|llamar|mandar|enviar|acosar|buscar)(me|nos)?\b/,
    reason: "baja_explicita",
  },
  // "déjenme en paz", "déjame tranquilo"
  {
    re: /\bdej(a|e|en)(me|nos)\s+(ya\s+)?(en\s+paz|tranquil[oa]s?|quiet[oa]s?)\b/,
    reason: "baja_explicita",
  },
  // "no quiero recibir más mensajes", "no quiero que me escriban"
  {
    re: /\bno\s+(quiero|deseo|queremos)\s+(recibir|seguir\s+recibiendo|que\s+me\s+(sigan\s+)?(escriban|contacten|manden|envien|molesten|llamen|busquen|escribiendo|contactando|mandando|enviando|molestando|llamando|buscando))\b/,
    reason: "baja_explicita",
  },
  // "no insistan", "no molesten" (sin "me")
  {
    re: /\bno\s+(mas\s+)?(insist(a|as|an)|molest(e|es|en)|fastidi(e|es|en))\b/,
    reason: "baja_explicita",
  },
  {
    re: /\bno\s+(quiero|deseo|queremos)\s+(mas\s+)?(mensajes|publicidad|promociones|spam)\b/,
    reason: "baja_explicita",
  },
  {
    re: /\b(stop|unsubscribe|unsuscribe|optout|opt out)\b/,
    reason: "baja_explicita",
  },
  {
    re: /\b(desuscrib|desinscrib|desafili|desuscri)\w*/,
    reason: "baja_explicita",
  },
  // "me doy de baja", "quiero darme de baja", "solicito la baja"
  {
    re: /\b(dar(me|nos)?|doy|damos|quiero|deseo|solicito|pido)\s+(la\s+|de\s+)?baja\b/,
    reason: "baja_explicita",
  },
  // "sáquenme de la lista", "bórrenme de su base de datos"
  {
    re: /\b(saque?n?|saca|sacar|quite?n?|quita|quitar|elimine?n?|elimina|eliminar|borre?n?|borra|borrar|remuevan|remueve|remover|retire?n?|retira|retirar|bote?n?)(me|nos)?\s+de\s+(su|sus|la|las|esta|esa|este|ese|el|los|tu|tus)\s+(lista|listas|base|bases|grupo|difusion|sistema|registro|contactos|bd|crm)\b/,
    reason: "baja_explicita",
  },
  // "borren mi número", "eliminen mi contacto"
  {
    re: /\b(saque?n?|saca|sacar|quite?n?|quita|quitar|elimine?n?|elimina|eliminar|borre?n?|borra|borrar|remuevan|remueve|remover|retire?n?|retira|retirar|bote?n?)(me|nos)?\s+(mi|mis|este)\s+(numero|contacto|telefono|celular|whatsapp)\b/,
    reason: "baja_explicita",
  },
  // Falta de permiso: "no autorizo", "nunca les di mi número"
  {
    re: /\b(no\s+(autorizo|autorice|autorizamos|he\s+autorizado|di\s+(mi\s+)?(permiso|autorizacion|consentimiento)|les\s+di\s+(mi\s+)?(numero|permiso))|nunca\s+(autorice|les\s+di|di\s+permiso))\b/,
    reason: "baja_explicita",
  },
  // Inglés
  {
    re: /\b(do\s+not|dont|don\s+t)\s+(text|message|contact|write|call)\b|\bleave\s+me\s+alone\b|\bremove\s+me\b|\bstop\s+(texting|messaging|writing|calling)\b/,
    reason: "baja_explicita",
  },

  // Habeas data (Ley 1581 de 2012, Colombia): baja y queda marcado para que lo atiendas.
  {
    re: /\bhabeas\s+data\b|\bley\s+1581\b|\b(elimin|borr|supri|retir|destru)\w*\s+(todos\s+)?(mis|los\s+mis|toda\s+mi)\s+(datos|informacion)\b|\brevoc\w*\s+(la\s+|mi\s+|el\s+)?(autorizacion|consentimiento|permiso)\b/,
    reason: "eliminacion_datos",
  },

  // Número equivocado o "no te conozco"
  {
    re: /\b(numero|telefono|celular|contacto)\s+equivocad[oa]\b|\bequivocad[oa]s?\s+de\s+(numero|persona|contacto)\b|\b(se|te|nos)\s+equivoc\w*\s+de\s+(numero|persona|contacto)\b|\bwrong\s+(number|person)\b|\bno\s+soy\s+(esa\s+persona|la\s+persona|quien\s+busca\w*|el\s+que\s+busca\w*|la\s+que\s+busca\w*)\b|\bno\s+soy\s+yo$|\bno\s+conozco\s+(a\s+)?(esa|ese|esta|este)\s+(persona|empresa|senor|senora|nombre)\b|\bno\s+se\s+quien\s+(es|son|eres)\s+(usted|ustedes|tu)\b|\bno\s+(pedi|solicite|he\s+pedido|he\s+solicitado|me\s+inscribi|me\s+registre)\s+(nada|ninguna|ningun|informacion|esto|eso|en\s+nada)\b/,
    reason: "numero_equivocado",
  },

  // Queja, spam o amenaza de denuncia/bloqueo
  {
    re: /\bspam\b|\bacos(o|ando|an|ar|adores?)\b|\bhostig\w*|\b(los|las|les|te)\s+(voy\s+a\s+)?(report|denunci)\w*|\b(los|las|lo|la|les|te)\s+(voy\s+a\s+)?bloque(o|ar|are|amos)\b|\bvoy\s+a\s+(reportar|denunciar|bloquear)(los|las|te|lo|la|les)\b|\b(bloquear|reportar|denunciar)\s+(este|el|su|tu)\s+numero\b|\bsuperintendencia\b|\b(como|donde|de\s+donde|quien|por\s+que)\s+(consiguieron|consiguio|sacaron|saco|obtuvieron|obtuvo|les\s+dio|te\s+dio|tienen|tiene)\s+(mi|este)\s+(numero|contacto|telefono|celular|whatsapp|dato|datos)\b|\bpor\s+que\s+(me|nos)\s+(siguen|vuelven|insisten|escriben|contactan|llaman|mandan)\b/,
    reason: "queja_spam",
  },

  // Insultos con mandato de alejarse
  {
    re: /\b(vete|vayanse|vayase|largo|larguense|larguese)\s+(a\s+la\s+mierda|al\s+carajo|a\s+la\s+verga|pal\s+carajo|pa\s+la\s+mierda|a\s+la\s+porra)\b|\bfuck\s+off\b|\b(a\s+la\s+mierda|al\s+carajo)\s+(con\s+)?(ustedes|usted|tu|eso|esto)\b/,
    reason: "insulto",
  },
];

/** "Me escriban más, pero por correo": preferencia de canal, no rechazo; lo decide la IA. */
const CHANNEL_PREFERENCE =
  /\b(mejor|sino|prefiero|en\s+vez|en\s+lugar)\b|\b(al|por)\s+(correo|mail|email|telefono|llamada)\b/;

const INSULT_WORDS =
  /\b(malparid\w*|hijueputa\w*|jueputa\w*|hijo\s+de\s+puta|hp|hpta|hdp|gonorrea\w*|pirob\w*|carechimba\w*|careverga\w*|imbecil\w*|idiota\w*|estupid[oa]s?|pendej[oa]s?|huevon\w*|guevon\w*|maldit[oa]s?|ladron\w*|estafador\w*|ratas?|asco)\b/;

/** "No me interesa" y similares: rechazo si el mensaje es corto; si es largo, decide la IA. */
const NOT_INTERESTED_RULES: RegExp[] = [
  /\bno\s+(me|nos|le|les)\s+interes(a|an|o)\b/,
  /\bno\s+(estoy|estamos|soy|somos)\s+(muy\s+)?interesad[oa]s?\b/,
  /\b(sin|ningun|cero)\s+interes\b|\bno\s+(tengo|tenemos)\s+(ningun\s+)?interes\b/,
  /\bno\s+gracias\b/,
  /\bno\s+(lo\s+|la\s+|los\s+|las\s+)?(necesito|necesitamos|requiero|requerimos|quiero|queremos|deseo)(\s+(nada|eso|esto|sus\s+servicios|el\s+servicio|ninguno|ninguna|nada\s+de\s+eso))?$/,
  /\bya\s+(tengo|tenemos|contrat\w+|compr\w+|consegu\w+)\s+(proveedor|quien|alguien|otr[oa]|un[oa]?\s+(empresa|proveedor|agencia|servicio)|eso|lo\s+que\s+necesit\w+)\b/,
  /\bno\s+estoy\s+buscando\b|\bno\s+busco\s+(nada|eso)\b/,
  /\b(que\s+)?(fastidio|jartera|cansones|intensos|intensas|insistentes|pesados|pesadas|pesadez)\b/,
  /\bnot\s+interested\b|\bno\s+thanks?\b|\bno\s+thank\s+you\b/,
];

const PAUSE_RULES: RegExp[] = [
  /\b(ahora|por\s+ahora|en\s+este\s+momento|de\s+momento|hoy)\s+no\b/,
  /\bno\s+(por\s+ahora|en\s+este\s+momento|de\s+momento|es\s+(un\s+)?(buen\s+)?momento)\b/,
  /\b(mas\s+adelante|en\s+otro\s+momento|otro\s+dia|el\s+otro\s+ano|el\s+proximo\s+ano)\b/,
  /\b(despues|luego|yo)\s+(te|les|le)\s+(escribo|aviso|contacto|confirmo|digo)\b/,
  /\blo\s+(voy\s+a\s+)?(pens(ar|are|amos|aremos)|consult(o|are|amos))\b|\bdej(a|e|en)me\s+pensarlo\b/,
];

function wordCount(normalized: string): number {
  return normalized ? normalized.split(" ").length : 0;
}

export function detectRejection(text: string): RejectionResult {
  if (isOnlyStopEmojis(text)) {
    return {
      action: "opt_out",
      matched: text.trim(),
      reason: "baja_explicita",
    };
  }

  const normalized = normalizeMessage(text);
  if (!normalized) {
    return { action: "none" };
  }
  const words = wordCount(normalized);
  // Quita "por favor"/"gracias" al final para que "stop por favor" cuente como "stop".
  const core = normalized
    .replace(/\s+(por\s+favor|gracias|ya|ok|okay)$/g, "")
    .replace(/^(ya\s+|por\s+favor\s+)/, "");

  if (EXACT_OPT_OUT.has(normalized) || EXACT_OPT_OUT.has(core)) {
    return { action: "opt_out", matched: normalized, reason: "baja_explicita" };
  }

  for (const rule of HARD_RULES) {
    const match = normalized.match(rule.re);
    if (match) {
      if (
        rule.reason === "baja_explicita" &&
        CHANNEL_PREFERENCE.test(normalized)
      ) {
        return { action: "ask_ai", matched: match[0], reason: rule.reason };
      }
      return { action: "opt_out", matched: match[0], reason: rule.reason };
    }
  }

  const insult = normalized.match(INSULT_WORDS);
  if (insult) {
    return words <= SHORT_INSULT_WORDS
      ? { action: "opt_out", matched: insult[0], reason: "insulto" }
      : { action: "ask_ai", matched: insult[0], reason: "insulto" };
  }

  if (EXACT_NOT_INTERESTED.has(normalized) || EXACT_NOT_INTERESTED.has(core)) {
    return { action: "opt_out", matched: normalized, reason: "no_interesado" };
  }

  for (const re of NOT_INTERESTED_RULES) {
    const match = normalized.match(re);
    if (match) {
      return words <= SHORT_MESSAGE_WORDS
        ? { action: "opt_out", matched: match[0], reason: "no_interesado" }
        : { action: "ask_ai", matched: match[0], reason: "no_interesado" };
    }
  }

  for (const re of PAUSE_RULES) {
    const match = normalized.match(re);
    if (match) {
      return { action: "pause", matched: match[0] };
    }
  }

  if (EXACT_ASK_AI.has(normalized) || EXACT_ASK_AI.has(core)) {
    return { action: "ask_ai", matched: normalized, reason: "baja_explicita" };
  }

  return { action: "none" };
}

const EXACT_REACTIVATION = new Set([
  "alta",
  "start",
  "unstop",
  "reactivar",
  "suscribir",
  "suscribirme",
  "volver",
]);

/** Señales de interés en el producto o en agendar. */
const INTEREST_RULES: RegExp[] = [
  // Interés explícito o cambio de opinión
  /\bme\s+interesa\w*\b|\bcambie\s+de\s+opinion\b|\bme\s+arrepenti\b|\breconsider\w*\b|\bretomar\b/,
  /\b(quiero|deseo|me\s+gustaria|quisiera|necesito)\s+(que\s+me\s+(escriban|contacten|vuelvan\s+a\s+escribir)|(volver\s+a\s+)?recibir\s+(mensajes|informacion))\b/,
  // Precio o cotización
  /\b(precio|precios|costo|costos|valor|tarifa|tarifas|cotiza\w*|presupuesto|planes|paquetes)\b|\bcuanto\s+(cuesta|cuestan|vale|valen|cobran|sale|salen|seria|es)\b/,
  // Información del producto
  /\b(informacion|detalles|catalogo|portafolio|brochure)\b|\bcomo\s+funciona\b|\bque\s+(incluye|ofrecen|servicios|productos|hacen|venden)\b/,
  // Cita
  /\b(cita|citas|reunion|reunirnos|llamada|videollamada|agendar|agenda|agendemos|cuadrar|cuadremos|disponibilidad|horario|horarios|visita|demo|asesoria)\b|\bcuando\s+(podemos|pueden|nos\s+vemos|tienen)\b/,
  // Compra
  /\b(comprar|contratar|adquirir|cotizar)\b|\b(quiero|necesito|busco)\s+(el|la|los|las|un|una|unos|unas|sus|su)\s+\w+/,
  // Viene de un anuncio o de la web
  /\bvi\s+(su|tu|el|la|un|una)\s+(anuncio|publicidad|publicacion|post|video|reel|historia|pagina|web|promocion)\b/,
  // Ubicación del negocio
  /\bdonde\s+(quedan|estan|los\s+encuentro|queda)\b|\b(direccion|ubicacion)\b/,
];

/** Niega el deseo ("no quiero agendar", "no necesito precios"): sigue en silencio. */
const NEGATED_DESIRE =
  /\bno\s+(quiero|queremos|deseo|necesito|necesitamos|me\s+gustaria|quisiera|busco|me\s+interesa\w*)\b/;

export type ReturningContactAction = "reactivate" | "stay_silent" | "ask_ai";

/**
 * Qué hacer cuando un contacto dado de baja vuelve a escribir por su cuenta.
 *
 * - "reactivate":  muestra interés (precio, información, cita, anuncio...). Se quita la baja,
 *                  se guarda el nuevo permiso con fecha y el bot retoma para agendar la cita.
 * - "stay_silent": vuelve a rechazar o se queja. No se responde; el mensaje queda guardado.
 * - "ask_ai":      neutro ("hola", "ok", "?"). La IA mira el historial y el motivo de la baja
 *                  (p. ej. "número equivocado") y decide si retoma o se queda en silencio.
 */
export function classifyReturningContact(text: string): ReturningContactAction {
  const rejection = detectRejection(text);
  if (rejection.action === "opt_out" || rejection.action === "pause") {
    return "stay_silent";
  }
  if (rejection.action === "ask_ai") {
    return "ask_ai";
  }

  const normalized = normalizeMessage(text);
  if (!normalized) {
    return "ask_ai";
  }
  if (/\bno\s+se\s+si\b/.test(normalized)) {
    return "ask_ai";
  }
  if (NEGATED_DESIRE.test(normalized)) {
    return "stay_silent";
  }
  if (
    EXACT_REACTIVATION.has(normalized) ||
    INTEREST_RULES.some((re) => re.test(normalized))
  ) {
    return "reactivate";
  }
  return "ask_ai";
}
