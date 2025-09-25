import { NextRequest, NextResponse } from 'next/server';
import { authorizedGoogleFetch, getValidTokens } from '@/lib/google';
import { ensureSession, getSessionIdFromRequest } from '@/lib/session';

export async function GET(request: NextRequest) {
  let sessionId = getSessionIdFromRequest(request);
  let authorized = false;
  let list: unknown = undefined;

  if (sessionId) {
    const tokens = await getValidTokens(sessionId);
    if (tokens) {
      try {
        const gmailResponse = await authorizedGoogleFetch(
          sessionId,
          'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=10'
        );
        authorized = gmailResponse.status !== 401;
        if (gmailResponse.ok) {
          list = await gmailResponse.json();
        }
      } catch (err) {
        console.error('Failed to fetch unread messages', err);
      }
    }
  }

  const response = NextResponse.json({ authorized, list });
  if (!sessionId) {
    ensureSession(request, response);
  }
  return response;
}
