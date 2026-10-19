import "server-only";

type CalendarEvent = { id: string; htmlLink?: string; hangoutLink?: string };

export async function createCalendarEvent(input: {
  name: string;
  email: string;
  company: string;
  preferredDate: string;
  topic: string;
  notes?: string;
}): Promise<CalendarEvent | null> {
  const { GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET,
    GOOGLE_CALENDAR_REFRESH_TOKEN, GOOGLE_CALENDAR_ID } = process.env;
  if (!GOOGLE_CALENDAR_CLIENT_ID || !GOOGLE_CALENDAR_CLIENT_SECRET ||
      !GOOGLE_CALENDAR_REFRESH_TOKEN || !GOOGLE_CALENDAR_ID) return null;

  const start = new Date(input.preferredDate);
  if (Number.isNaN(start.getTime())) {
    throw new Error("La fecha de la reunión debe ser una fecha y hora entendible, por ejemplo 2026-10-18T15:30:00-05:00.");
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: GOOGLE_CALENDAR_CLIENT_SECRET,
      refresh_token: GOOGLE_CALENDAR_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenResponse.ok) throw new Error(`Google OAuth rechazó la solicitud (${tokenResponse.status}).`);
  const { access_token: accessToken } = await tokenResponse.json() as { access_token: string };
  const end = new Date(start.getTime() + 30 * 60_000);
  const eventResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: `Llamada estratégica: ${input.company}`,
      description: `Tema: ${input.topic}${input.notes ? `\nNotas: ${input.notes}` : ""}`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: [{ email: input.email, displayName: input.name }],
      conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
    }),
  });
  if (!eventResponse.ok) throw new Error(`Google Calendar no pudo crear el evento (${eventResponse.status}).`);
  return await eventResponse.json() as CalendarEvent;
}
