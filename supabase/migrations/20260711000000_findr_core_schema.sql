-- FindrAI core schema — reports, matches, verification, chat, broadcasts, QR tags, audit.
-- Mirrors the client data model in src/lib/types.ts; apply with `supabase db push`
-- when moving app data from the local store to the cloud.

CREATE TYPE public.report_kind AS ENUM ('lost', 'found');
CREATE TYPE public.report_status AS ENUM ('open', 'matched', 'recovered', 'escalated');

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind public.report_kind NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 500,
  sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Private verification Q&A: never exposed through the public reports view.
CREATE TABLE public.report_private_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  found_report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  text_score SMALLINT,
  vision_score SMALLINT,
  distance_km DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'candidate', -- candidate | verified | rejected | escalated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lost_report_id, found_report_id)
);

CREATE TABLE public.verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  recovered BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recovered_at TIMESTAMPTZ
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = system
  kind TEXT NOT NULL DEFAULT 'text', -- text | location | image
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.qr_tags (
  id TEXT PRIMARY KEY, -- e.g. TAG-8F2A61
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.qr_tag_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id TEXT NOT NULL REFERENCES public.qr_tags(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reports_status_idx ON public.reports (status);
CREATE INDEX reports_kind_category_idx ON public.reports (kind, category);
CREATE INDEX reports_created_idx ON public.reports (created_at DESC);
CREATE INDEX messages_connection_idx ON public.messages (connection_id, created_at);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row level security -------------------------------------------------------

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_private_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tag_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT SELECT, INSERT ON public.report_private_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.matches TO authenticated;
GRANT SELECT, INSERT ON public.verification_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.connections TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, INSERT ON public.broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qr_tags TO authenticated;
GRANT SELECT, INSERT ON public.qr_tag_scans TO anon, authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Reports are public (that's the point of the network) but private fields are not.
CREATE POLICY "reports_select" ON public.reports
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_update_own" ON public.reports
  FOR UPDATE TO authenticated USING (auth.uid() = reporter_id);

-- Only the report owner may read/write its private verification fields;
-- verification is performed server-side via the verify_answers function.
CREATE POLICY "private_fields_owner" ON public.report_private_fields
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.reporter_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.reporter_id = auth.uid()));

CREATE POLICY "matches_select_participant" ON public.matches
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reports r
    WHERE (r.id = lost_report_id OR r.id = found_report_id) AND r.reporter_id = auth.uid()
  ));
CREATE POLICY "matches_insert" ON public.matches
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "matches_update_participant" ON public.matches
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reports r
    WHERE (r.id = lost_report_id OR r.id = found_report_id) AND r.reporter_id = auth.uid()
  ));

CREATE POLICY "verification_attempts_own" ON public.verification_attempts
  FOR ALL TO authenticated
  USING (claimant_id = auth.uid()) WITH CHECK (claimant_id = auth.uid());

CREATE POLICY "connections_participant" ON public.connections
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.reports r ON r.id IN (m.lost_report_id, m.found_report_id)
    WHERE m.id = match_id AND r.reporter_id = auth.uid()
  ))
  WITH CHECK (true);

CREATE POLICY "messages_participant" ON public.messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.connections c
    JOIN public.matches m ON m.id = c.match_id
    JOIN public.reports r ON r.id IN (m.lost_report_id, m.found_report_id)
    WHERE c.id = connection_id AND r.reporter_id = auth.uid()
  ))
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "broadcasts_select" ON public.broadcasts
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "broadcasts_insert_own" ON public.broadcasts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "qr_tags_owner" ON public.qr_tags
  FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Anyone (even signed-out finders) may record a scan; only owners read them.
CREATE POLICY "qr_scans_insert_any" ON public.qr_tag_scans
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "qr_scans_select_owner" ON public.qr_tag_scans
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qr_tags t WHERE t.id = tag_id AND t.owner_id = auth.uid()));

CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_logs_insert" ON public.admin_logs
  FOR INSERT TO authenticated WITH CHECK (true);
