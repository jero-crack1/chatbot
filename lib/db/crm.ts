import "server-only";
import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

function getClient() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL is required to persist CRM data in Supabase.");
  }
  client ??= postgres(connectionString, { max: 1, ssl: "require" });
  return client;
}

export async function persistLead(input: {
  id: string;
  name: string;
  email: string;
  company: string;
  need: string;
  qualificationStatus: string;
  urgency?: string;
  budget?: string;
  leadType?: string;
  meetingDate?: string | null;
}) {
  const sql = getClient();
  await sql`
    INSERT INTO leads (id, nombre, empresa, correo, tipo_lead, fecha_reunion)
    VALUES (${input.id}, ${input.name}, ${input.company}, ${input.email}, ${input.leadType ?? "Informativo/Académico"}, ${input.meetingDate ?? null})
  `;
}

export async function persistMeeting(input: {
  id: string;
  name: string;
  email: string;
  company: string;
  preferredDate: string;
  topic: string;
  meetingLink: string | null;
  calendarEventId?: string;
  status: string;
}) {
  const sql = getClient();
  await sql`
    INSERT INTO meetings (id, name, email, company, preferred_date, topic, meeting_link, calendar_event_id, status)
    VALUES (${input.id}, ${input.name}, ${input.email}, ${input.company}, ${input.preferredDate}, ${input.topic}, ${input.meetingLink}, ${input.calendarEventId ?? null}, ${input.status})
  `;
}

export async function updateMeetingCalendar(input: { id: string; meetingLink: string | null; calendarEventId: string }) {
  const sql = getClient();
  await sql`UPDATE meetings SET meeting_link = ${input.meetingLink}, calendar_event_id = ${input.calendarEventId}, status = 'confirmed' WHERE id = ${input.id}`;
}
