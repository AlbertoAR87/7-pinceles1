-- Preserve the existing project and its data. No tables are recreated.
-- TRUNCATE bypasses RLS and has no legitimate use in the frontend.
revoke truncate, references, trigger on public.profiles, public.membership_applications,
  public.workshops, public.workshop_registrations, public.member_resources from anon, authenticated;

-- Registration is closed until capacity and concurrency have been validated.
revoke insert, update on public.workshop_registrations from anon, authenticated;
revoke insert (workshop_id, user_id), update (status, updated_at)
  on public.workshop_registrations from anon, authenticated;

-- Administrative notes are not part of the member-facing application record.
revoke select on public.membership_applications from authenticated;
grant select (id, user_id, motivation, privacy_accepted_at, status, submitted_at, reviewed_at)
  on public.membership_applications to authenticated;
