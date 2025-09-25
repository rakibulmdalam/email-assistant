import { NextRequest, NextResponse } from 'next/server';
import { authorizedGoogleFetch, getValidTokens } from '@/lib/google';
import { getSessionIdFromRequest, ensureSession } from '@/lib/session';
import { analyzeEmail } from '@/lib/llm';

function decodeBody(data?: string): string {
  if (!data) return '';
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(base64, 'base64');
  return buffer.toString('utf8');
}

function extractText(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBody(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractText(part);
      if (text) return text;
    }
  }
  if (payload.body?.data) {
    return decodeBody(payload.body.data);
  }
  return '';
}

function getHeader(headers: any[], name: string): string | undefined {
  const header = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value;
}

export async function POST(request: NextRequest) {
  const sessionId = getSessionIdFromRequest(request);
  const unauthorized = NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!sessionId) {
    ensureSession(request, unauthorized);
    return unauthorized;
  }

  const valid = await getValidTokens(sessionId);
  if (!valid) {
    return unauthorized;
  }

  const body = await request.json();
  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  try {
    const gmailResponse = await authorizedGoogleFetch(
      sessionId,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`
    );
    if (!gmailResponse.ok) {
      return NextResponse.json({ error: 'gmail fetch failed' }, { status: gmailResponse.status });
    }
    const msg = await gmailResponse.json();
    const subject = getHeader(msg.payload?.headers ?? [], 'Subject') ?? '(no subject)';
    let text = extractText(msg.payload);
    if (!text) {
      text = msg.snippet ?? '';
    }
    const ai = await analyzeEmail(subject, text);
    return NextResponse.json({ msg, ai });
  } catch (err) {
    console.error('Failed to analyze message', err);
    return NextResponse.json({ error: 'analysis failed' }, { status: 500 });
  }
}
