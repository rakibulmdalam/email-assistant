import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google';
import { ensureSession } from '@/lib/session';
import { setTokens } from '@/lib/memoryStore';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const authError = url.searchParams.get('error');

  const redirectTarget = new URL('/', request.url);
  const response = NextResponse.redirect(redirectTarget);
  const sessionId = ensureSession(request, response);

  if (code && !authError) {
    try {
      const tokens = await exchangeCodeForTokens(code);
      setTokens(sessionId, tokens);
    } catch (err) {
      console.error('Token exchange failed', err);
    }
  }

  return response;
}
