import { NextRequest, NextResponse } from 'next/server';
import { authorizedGoogleFetch, getValidTokens } from '@/lib/google';
import { ensureSession, getSessionIdFromRequest } from '@/lib/session';

type CreateEventBody = {
  summary: string;
  start: string;
  end: string;
  attendees?: Array<{ email: string } | string>;
};

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

  const body = (await request.json()) as CreateEventBody;
  if (!body?.summary || !body.start || !body.end) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const attendees = Array.isArray(body.attendees)
    ? body.attendees
        .map((a) => (typeof a === 'string' ? { email: a } : a))
        .filter((a) => a && typeof a.email === 'string')
    : undefined;

  const eventPayload = {
    summary: body.summary,
    start: { dateTime: body.start },
    end: { dateTime: body.end },
    attendees,
  };

  try {
    const calendarResponse = await authorizedGoogleFetch(
      sessionId,
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        body: JSON.stringify(eventPayload),
      }
    );
    if (!calendarResponse.ok) {
      return NextResponse.json({ error: 'calendar create failed' }, { status: calendarResponse.status });
    }
    const event = await calendarResponse.json();
    return NextResponse.json({ event });
  } catch (err) {
    console.error('Calendar create failed', err);
    return NextResponse.json({ error: 'calendar create failed' }, { status: 500 });
  }
}
