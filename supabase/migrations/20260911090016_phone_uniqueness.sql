-- =============================================================================
-- 0016: enforce phone-number uniqueness across profiles.
--
-- username and email already had case-insensitive unique indexes since
-- migration 0002; phone had none, so two accounts could share the same
-- number. Partial (excludes NULL) since `phone` isn't NOT NULL at the
-- column level — sign-up/profile-update both require it in practice
-- (signUpSchema/updateProfileSchema), but a future admin-created row
-- without one shouldn't be blocked by a stray NULL-vs-NULL "duplicate".
-- =============================================================================

create unique index profiles_phone_idx on public.profiles (phone) where phone is not null;
