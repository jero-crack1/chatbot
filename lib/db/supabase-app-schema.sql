-- Tablas de la aplicación definidas en lib/db/schema.ts y
-- lib/db/migrations/0000_initial.sql.
-- Este archivo NO incluye leads ni meetings.
-- Ejecutar en Supabase SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS public."User" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(64) NOT NULL,
  "password" varchar(64),
  "name" text,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "isAnonymous" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."Chat" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp NOT NULL,
  "title" text NOT NULL,
  "userId" uuid NOT NULL REFERENCES public."User"("id"),
  "visibility" varchar NOT NULL DEFAULT 'private'
);

CREATE TABLE IF NOT EXISTS public."Message_v2" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL REFERENCES public."Chat"("id"),
  "role" varchar NOT NULL,
  "parts" json NOT NULL,
  "attachments" json NOT NULL,
  "createdAt" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS public."Vote_v2" (
  "chatId" uuid NOT NULL REFERENCES public."Chat"("id"),
  "messageId" uuid NOT NULL REFERENCES public."Message_v2"("id"),
  "isUpvoted" boolean NOT NULL,
  PRIMARY KEY ("chatId", "messageId")
);

CREATE TABLE IF NOT EXISTS public."Document" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" timestamp NOT NULL,
  "title" text NOT NULL,
  "content" text,
  "text" varchar NOT NULL DEFAULT 'text',
  "userId" uuid NOT NULL REFERENCES public."User"("id"),
  PRIMARY KEY ("id", "createdAt")
);

CREATE TABLE IF NOT EXISTS public."Suggestion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "documentId" uuid NOT NULL,
  "documentCreatedAt" timestamp NOT NULL,
  "originalText" text NOT NULL,
  "suggestedText" text NOT NULL,
  "description" text,
  "isResolved" boolean NOT NULL DEFAULT false,
  "userId" uuid NOT NULL REFERENCES public."User"("id"),
  "createdAt" timestamp NOT NULL,
  FOREIGN KEY ("documentId", "documentCreatedAt")
    REFERENCES public."Document"("id", "createdAt")
);

CREATE TABLE IF NOT EXISTS public."Stream" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL REFERENCES public."Chat"("id"),
  "createdAt" timestamp NOT NULL
);

-- La aplicación accede a estas tablas desde el servidor con POSTGRES_URL.
-- RLS queda activado y sin políticas para anon/authenticated.
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Vote_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Stream" ENABLE ROW LEVEL SECURITY;

COMMIT;
