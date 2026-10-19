import { tool } from "ai";
import { z } from "zod";
import { persistMeeting, updateMeetingCalendar } from "@/lib/db/crm";
import { sendMeetingConfirmation } from "@/lib/email/send-meeting-confirmation";
import { createCalendarEvent } from "./google-calendar";

export interface MeetingDetails {
  id: string;
  name: string;
  email: string;
  company: string;
  preferredDate: string;
  topic: string;
  meetingLink: string | null;
  status: "confirmed" | "pending_calendar_setup";
  emailStatus?: "sent" | "not_configured" | "failed" | "missing_meeting_link";
  createdAt: string;
}

export const bookMeeting = tool({
  description: "Agenda una llamada estratégica para un lead calificado. La fecha y hora deben expresarse con zona horaria o formato ISO (por ejemplo 2026-10-18T15:30:00-05:00).",
  inputSchema: z.object({
    name: z.string().describe("Nombre completo del lead"),
    email: z.string().email().describe("Correo del lead"),
    company: z.string().describe("Empresa del lead"),
    preferredDate: z.string().describe("Fecha y hora ISO con zona horaria"),
    topic: z.string().describe("Tema de la reunión"),
    notes: z.string().optional().describe("Notas para el equipo comercial"),
  }),
  execute: async (input) => {
    const meetingId = `MEET-${crypto.randomUUID()}`;
    await persistMeeting({
      id: meetingId,
      name: input.name,
      email: input.email,
      company: input.company,
      preferredDate: input.preferredDate,
      topic: input.topic,
      meetingLink: null,
      status: "pending_calendar_setup",
    });

    const calendarEvent = await createCalendarEvent(input);
    const meetingLink = calendarEvent?.hangoutLink ?? calendarEvent?.htmlLink ?? null;
    const status = calendarEvent ? "confirmed" : "pending_calendar_setup";
    if (calendarEvent) {
      await updateMeetingCalendar({ id: meetingId, meetingLink, calendarEventId: calendarEvent.id });
    }

    const emailResult = calendarEvent
      ? await sendMeetingConfirmation({ ...input, meetingLink })
      : { status: "not_configured" as const };

    const details: MeetingDetails = {
      id: meetingId,
      ...input,
      meetingLink,
      status,
      emailStatus: emailResult.status,
      createdAt: new Date().toISOString(),
    };

    const message = !calendarEvent
      ? `Solicitud de reunión guardada para ${input.name}; falta configurar Google Calendar para crear el evento.`
      : emailResult.status === "sent"
        ? `Llamada creada en Google Calendar y correo de confirmación enviado a ${input.email}.`
        : emailResult.status === "not_configured"
          ? "Llamada creada en Google Calendar; falta configurar RESEND_API_KEY o RESEND_FROM_EMAIL y el correo no se envió."
          : emailResult.status === "missing_meeting_link"
            ? "Llamada creada, pero Google no devolvió un enlace; el correo no se envió."
            : "Llamada creada en Google Calendar, pero Resend no pudo enviar el correo de confirmación.";

    return {
      success: true,
      status,
      meetingId,
      meetingLink,
      emailStatus: emailResult.status,
      message,
      details,
    };
  },
});
