# Plus Tensions CRM

Small internal CRM for the invoice automation workflows.

## What It Does

- Lists invoices from the existing `invoices` Postgres table.
- Shows customers grouped by `customer_code`.
- Opens Mollie links, PDF links, and customer Drive folders.
- Sends actions to n8n:
  - resend invoice reminder
  - snooze reminder
  - mark invoice as paid

## Environment Variables

Set these in Coolify:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@postgresql-database-1:5432/postgres
CRM_PUBLIC_URL=https://crm.moodmee.nl
CRM_AUTH_TOKEN=change-this-long-random-token
CRM_USERNAME=admin
CRM_PASSWORD=change-this-password
CRM_COOKIE_SECURE=true
N8N_BASE_URL=https://n8n.your-domain.com
REMINDER_WEBHOOK_SECRET=change-this-same-as-n8n
NEXT_PUBLIC_APP_NAME=Plus Tensions CRM
```

`CRM_USERNAME` and `CRM_PASSWORD` protect the dashboard with the built-in login page.
`CRM_AUTH_TOKEN` is saved in browser localStorage after login and is also stored as an HTTP-only cookie for server navigation.
Use `CRM_COOKIE_SECURE=true` on `https://crm.moodmee.nl`.
Do not set `HOSTNAME`, `NEXTAUTH_URL`, or `NEXT_PUBLIC_SITE_URL`.
`CRM_PUBLIC_URL` is the canonical public URL used for login/logout redirects behind Coolify.

## Coolify Deploy

1. Create a new application in Coolify.
2. Use this folder as the source.
3. Build pack: Dockerfile.
4. Port: `3000`.
5. Add the environment variables above.
6. Deploy.

Recommended subdomain:

```text
crm.moodmee.nl
```

After deployment, open:

```text
https://crm.moodmee.nl/api/health
```

It should show `publicOrigin` as `https://crm.moodmee.nl`.

## Important

The CRM does not duplicate email, WhatsApp, Mollie, or Drive logic.
It calls the existing n8n reminder webhook:

```text
/webhook/invoice-reminder-action
```

So keep the reminder workflow active.
