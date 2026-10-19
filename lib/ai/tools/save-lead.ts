import { tool } from "ai";
import { z } from "zod";
import { persistLead } from "@/lib/db/crm";

export interface LeadRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  need: string;
  qualificationStatus: "calificado" | "en_evaluacion" | "no_calificado";
  urgency?: string;
  budget?: string;
  createdAt: string;
}

async function storeLead(input: {
  name: string; email: string; company: string; need?: string;
  qualificationStatus: LeadRecord["qualificationStatus"]; urgency?: string;
  budget?: string; leadType?: string; meetingDate?: string | null;
}) {
  const id = crypto.randomUUID();
  const lead: LeadRecord = {
    id, name: input.name, email: input.email, company: input.company,
    need: input.need || "Sin especificar", qualificationStatus: input.qualificationStatus,
    urgency: input.urgency, budget: input.budget, createdAt: new Date().toISOString(),
  };
  await persistLead({
    ...lead,
    leadType: input.leadType ?? (input.qualificationStatus === "calificado" ? "Calificado" : "Informativo/Académico"),
    meetingDate: input.meetingDate,
  });
  return { success: true as const, status: "saved", leadId: id, message: `Lead ${input.name} guardado en Supabase.`, lead };
}

export const saveLead = tool({
  description: "Guardar en la base de datos la información de contacto y calificación del prospecto.",
  inputSchema: z.object({
    name: z.string(), email: z.string().email(), company: z.string(),
    need: z.string().optional(),
    qualificationStatus: z.enum(["calificado", "en_evaluacion", "no_calificado"]).default("en_evaluacion"),
    urgency: z.string().optional(), budget: z.string().optional(),
  }),
  execute: (input) => storeLead(input),
});

export const guardarLeadEnBaseDeDatos = tool({
  description: "Registrar inmediatamente un lead en Supabase cuando se conozcan nombre, empresa y correo; también registrar fecha de reunión cuando aplique.",
  inputSchema: z.object({
    nombre: z.string().min(1), empresa: z.string().min(1), correo: z.string().email(),
    tipo_lead: z.enum(["Calificado", "Informativo/Académico"]),
    fecha_reunion: z.string().nullable().default(null),
  }),
  execute: (input) => storeLead({
    name: input.nombre, company: input.empresa, email: input.correo,
    need: input.fecha_reunion ? "Reunión agendada" : undefined,
    qualificationStatus: input.tipo_lead === "Calificado" ? "calificado" : "en_evaluacion",
    leadType: input.tipo_lead, meetingDate: input.fecha_reunion,
  }),
});
