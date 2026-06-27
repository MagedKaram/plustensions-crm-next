import { NextRequest, NextResponse } from 'next/server';
import { getPublicOrigin } from '@/lib/public-url';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    publicOrigin: getPublicOrigin(request),
    host: request.headers.get('host'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasCrmPassword: Boolean(process.env.CRM_PASSWORD),
    hasCrmAuthToken: Boolean(process.env.CRM_AUTH_TOKEN || process.env.CRM_TOKEN),
    hasN8nBaseUrl: Boolean(process.env.N8N_BASE_URL),
    hasReminderSecret: Boolean(process.env.REMINDER_WEBHOOK_SECRET),
  });
}
