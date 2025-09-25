import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'proto.sid';

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

export function getSessionIdFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAME)?.value;
}

export function ensureSession(request: NextRequest, response: NextResponse): string {
  const existing = request.cookies.get(COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }
  const id = generateSessionId();
  response.cookies.set({
    name: COOKIE_NAME,
    value: id,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return id;
}

export function getSessionId(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value;
}

export { COOKIE_NAME };
