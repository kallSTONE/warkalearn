# Google Sign-In Setup (Supabase Free)

This project now supports Google OAuth in the app layer.

## 1) Apply database migration

Run your Supabase migration workflow so `public.handle_new_user` and `on_auth_user_created` trigger are created:

- `supabase/migrations/20260316_google_oauth_profiles.sql`

This migration also backfills `public.profiles` for existing `auth.users` and normalizes default role to `lawyer`.

## 2) Configure Google OAuth app

In Google Cloud Console:

1. Configure OAuth consent screen.
2. Create an **OAuth 2.0 Client ID** of type **Web application**.
3. Add Authorized JavaScript origins:
   - `http://localhost:3000`
   - Your production app domain (example: `https://yourdomain.com`)
4. Add Authorized redirect URIs:
   - `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`

Copy the Google Client ID and Client Secret.

## 3) Enable Google provider in Supabase

In Supabase Dashboard:

1. Go to **Authentication > Providers > Google**.
2. Enable Google provider.
3. Paste Google Client ID and Client Secret.

## 4) Configure Auth URL settings in Supabase

In **Authentication > URL Configuration**:

- **Site URL**
  - Local: `http://localhost:3000`
  - Production: `https://yourdomain.com`
- **Additional Redirect URLs** (include both local and production callback paths):
  - `http://localhost:3000/auth/callback`
  - `https://yourdomain.com/auth/callback`

## 5) Configure app environment

Create/update `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<SUPABASE_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
```

## 6) Verify the flow

1. Start app (`npm run dev`).
2. Open `/login` (or `/register`) and click **Continue with Google**.
3. After callback, you should land on role-based destination:
   - `admin` -> `/admin/dashboard`
   - `reviewer` -> `/reviewer`
   - `lawyer` (default) -> `/dashboard`

## Notes

- The app uses Supabase default account-linking behavior for email collisions.
- Rotate any exposed secrets before production deployment.
