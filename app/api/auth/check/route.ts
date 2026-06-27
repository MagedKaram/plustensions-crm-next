import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    authenticated: request.cookies.get('crm_session')?.value === 'authenticated',
    hasCookie: Boolean(request.cookies.get('crm_session')?.value),
  });
}
