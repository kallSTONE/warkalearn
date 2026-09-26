# Infobip Phone Signup Setup (Split Login/Register + Email + Google)

This project uses explicit routes for authentication:

- `/login` for sign-in (password only, phone or email)
- `/register` for signup (phone OTP or email confirmation)

OTP is used only for **phone signup**.

## Auth route behavior

- `/login`
	- Input: phone or email + password
	- No OTP for phone login
	- No OTP for email login
	- Google sign-in supported
- `/register`
	- Inputs: full name, phone/email, optional referral code, password
	- Phone signup redirects to `/register/phone/verify` for OTP completion
	- Email signup redirects to `/register/check-email` for confirmation-link guidance
- Compatibility routes:
	- `/auth` redirects to `/login` (or `/register` when `ref` query is present)
	- `/login/phone` redirects to `/login`
	- `/register/phone` redirects to `/register`

## 1) Apply DB migrations

Apply both migrations:

- `supabase/migrations/20260317_smsportal_phone_auth.sql`
- `supabase/migrations/20260317_phone_registration_tickets.sql`

These create:

- `public.phone_otp_challenges`
- `public.phone_verifications`
- `public.phone_registration_tickets`

## 2) Set required environment variables

Add these server env variables (do **not** expose with `NEXT_PUBLIC_`):

```dotenv
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PHONE_OTP_HASH_SECRET=your_long_random_secret
PHONE_REGISTRATION_TICKET_SECRET=your_long_random_secret_for_ticket_encryption
INFOBIP_BASE_URL=https://xxxx.api.infobip.com
INFOBIP_API_KEY=your_infobip_api_key
INFOBIP_SENDER_ID=InfoSMS
PHONE_AUTH_DEBUG_OTP=true
```

Notes:

- `PHONE_REGISTRATION_TICKET_SECRET` is used to encrypt pending signup passwords server-side.
- `PHONE_AUTH_DEBUG_OTP=true` is for local debugging only. Set to `false` in production.
- `INFOBIP_BASE_URL` accepts a full HTTPS URL or a bare hostname (auto-normalized to HTTPS).

## 3) Infobip prerequisites

1. Confirm Ethiopia destination support on your Infobip plan.
2. Copy your Infobip API base URL.
3. Generate/copy API key.
4. Set an approved sender ID.

## 4) Supabase prerequisites

1. Keep Google provider enabled.
2. Keep Email provider/sign-in enabled.
3. Keep email auth confirmation flow enabled for email signup.
4. Optional: keep Supabase Phone provider enabled; fallback login still works via `/api/auth/phone/prepare-login` if direct phone login is disabled.

## 5) End-to-end test checklist

1. Open `/register` with a phone number.
2. Submit the signup form and confirm redirect to `/register/phone/verify`.
3. Enter OTP and complete signup.
4. Confirm automatic session completion/redirect after successful phone verification.
5. Open `/register` with an email and confirm redirect to `/register/check-email`.
6. Confirm the email confirmation link from Supabase completes account verification.
7. Open `/login` and confirm password-only login works for:
	 - phone + password
	 - email + password
8. Confirm Google auth still works from login/signup paths.

## Security checklist for production

- Set `PHONE_AUTH_DEBUG_OTP=false`.
- Rotate any leaked/old keys.
- Add CAPTCHA / stricter anti-abuse controls for OTP endpoints.

## Troubleshooting: "Unable to process OTP request right now"

This comes from OTP pre-send checks in `/api/auth/phone/request-otp`.

Check in order:

1. Apply migration `20260317_smsportal_phone_auth.sql`.
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set server-side.
3. Ensure Supabase URL and service role key target the same project.
4. Retry and inspect API error output for specific cause (`tables missing`, `permissions`, or `admin auth`).
