import "server-only";
import { Resend } from "resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendMeetingConfirmation(input: {
  name: string;
  email: string;
  company: string;
  preferredDate: string;
  topic: string;
  meetingLink: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { status: "not_configured" as const };
  if (!input.meetingLink) return { status: "missing_meeting_link" as const };

  const resend = new Resend(apiKey);
  const link = escapeHtml(input.meetingLink);
  const name = escapeHtml(input.name);
  const date = escapeHtml(input.preferredDate);
  const topic = escapeHtml(input.topic);
  try {
    const { error } = await resend.emails.send({
      from,
      to: [input.email],
      subject: `Confirmación de tu reunión con ${input.company}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Tu reunión está confirmada</h2><p>Hola ${name},</p><p>Registramos tu llamada estratégica para <strong>${date}</strong>.</p><p><strong>Tema:</strong> ${topic}</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#059669;color:#fff;text-decoration:none;border-radius:8px">Abrir reunión</a></p><p>Si tienes preguntas, responde a este correo.</p></div>`,
      text: `Hola ${input.name}, tu reunión está confirmada para ${input.preferredDate}. Tema: ${input.topic}. Abre la reunión aquí: ${input.meetingLink}`,
    });
    if (error) {
      console.error("Resend meeting confirmation failed:", error.message);
      return { status: "failed" as const };
    }
  } catch {
    console.error("Resend meeting confirmation request failed.");
    return { status: "failed" as const };
  }
  return { status: "sent" as const };
}
