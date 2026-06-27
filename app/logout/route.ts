import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete('crm_session');
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: '/login',
    },
  });
}
