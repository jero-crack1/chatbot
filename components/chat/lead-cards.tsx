"use client";

import {
  CalendarIcon,
  CheckCircle2Icon,
  Building2Icon,
  MailIcon,
  UserIcon,
  VideoIcon,
  BriefcaseIcon,
  ClockIcon,
  DollarSignIcon,
  ShieldCheckIcon,
} from "lucide-react";
import type { MeetingDetails } from "@/lib/ai/tools/book-meeting";
import type { LeadRecord } from "@/lib/ai/tools/save-lead";

export function BookMeetingCard({ details }: { details?: MeetingDetails }) {
  if (!details) return null;

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-card to-background p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/30">
            <CalendarIcon className="size-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">
              {details.status === "confirmed" ? "Llamada Estratégica Agendada" : "Solicitud de reunión guardada"}
            </h4>
            <span className="text-[11px] text-emerald-500 font-medium">
              ID: {details.id}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-500 border border-emerald-500/30">
          {details.status === "confirmed" ? <><CheckCircle2Icon className="size-3" /> Confirmada</> : "Pendiente de Calendar"}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-foreground font-medium bg-muted/40 p-2 rounded-lg">
          <ClockIcon className="size-3.5 text-emerald-500 shrink-0" />
          <span>{details.preferredDate}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <UserIcon className="size-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{details.name}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Building2Icon className="size-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{details.company}</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 truncate">
            <MailIcon className="size-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{details.email}</span>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-border/50 bg-background/50 p-2.5">
          <div className="text-[11px] font-medium text-muted-foreground">
            Objetivo estratégico:
          </div>
          <p className="mt-0.5 text-foreground leading-relaxed line-clamp-2">
            {details.topic}
          </p>
        </div>

        {details.meetingLink && <div className="pt-2">
          <a
            href={details.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
          >
            <VideoIcon className="size-3.5" />
            Abrir evento de Google Calendar
          </a>
        </div>}
      </div>
    </div>
  );
}

export function SaveLeadCard({ lead }: { lead?: LeadRecord }) {
  if (!lead) return null;

  const statusConfig = {
    calificado: {
      label: "Calificado B2B",
      color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    },
    en_evaluacion: {
      label: "En Evaluación",
      color: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    },
    no_calificado: {
      label: "No Calificado",
      color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    },
  }[lead.qualificationStatus ?? "en_evaluacion"];

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-card to-background p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500 ring-1 ring-blue-500/30">
            <ShieldCheckIcon className="size-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">
              Prospecto Registrado en CRM
            </h4>
            <span className="text-[11px] text-blue-500 font-medium">
              ID: {lead.id}
            </span>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${statusConfig.color}`}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2 text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
          <div className="flex items-center gap-1.5 truncate">
            <UserIcon className="size-3.5 text-blue-500 shrink-0" />
            <span className="font-medium text-foreground truncate">{lead.name}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Building2Icon className="size-3.5 text-blue-500 shrink-0" />
            <span className="font-medium text-foreground truncate">{lead.company}</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 truncate pt-1">
            <MailIcon className="size-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-background/50 p-2.5">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <BriefcaseIcon className="size-3" /> Necesidad detectada:
          </div>
          <p className="mt-1 text-foreground leading-relaxed">
            {lead.need}
          </p>
        </div>

        {(lead.urgency || lead.budget) && (
          <div className="flex items-center gap-2 pt-1 text-[11px]">
            {lead.urgency && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                <ClockIcon className="size-3 text-muted-foreground" />
                Urgencia: {lead.urgency}
              </span>
            )}
            {lead.budget && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                <DollarSignIcon className="size-3 text-muted-foreground" />
                Presupuesto: {lead.budget}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

