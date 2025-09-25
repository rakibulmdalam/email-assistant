import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/google';
import { ensureSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));
  const sessionId = ensureSession(request, response);
  const authUrl = buildAuthUrl(sessionId);
  response.headers.set('Location', authUrl);
  return response;
}
