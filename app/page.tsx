'use client';

import { useEffect, useState } from 'react';
import type { AiAnalysis } from '@/lib/llm';

type UnreadResponse = {
  authorized: boolean;
  list?: {
    messages?: { id: string; threadId?: string }[];
    [key: string]: unknown;
  };
};

type MessageResponse = {
  msg: any;
  ai: AiAnalysis;
};

type CalendarResult = {
  event: any;
};

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState<UnreadResponse | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MessageResponse | null>(null);
  const [eventResult, setEventResult] = useState<CalendarResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/gmail/unread', { credentials: 'include' });
        const data = (await res.json()) as UnreadResponse;
        setUnread(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const analyzeMessage = async (id: string) => {
    setActiveId(id);
    setEventResult(null);
    setError(null);
    try {
      const res = await fetch('/api/gmail/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        throw new Error('Analysis failed');
      }
      const data = (await res.json()) as MessageResponse;
      setAnalysis(data);
    } catch (err) {
      console.error(err);
      setError('Unable to analyze message');
    } finally {
      setActiveId(null);
    }
  };

  const createEvent = async () => {
    if (!analysis || analysis.ai.action !== 'create_event') return;
    const details = analysis.ai.action_details as
      | { summary?: string; start?: string; end?: string; attendees?: unknown }
      | undefined;
    if (!details?.summary || !details.start || !details.end) {
      setError('Missing event details from AI');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      if (!res.ok) {
        throw new Error('Calendar create failed');
      }
      const data = (await res.json()) as CalendarResult;
      setEventResult(data);
    } catch (err) {
      console.error(err);
      setError('Failed to create calendar event');
    }
  };

  const connectButton = (
    <a href="/api/auth/google/start" className="border px-3 py-1 inline-block">
      Connect Google
    </a>
  );

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">AI Email Assistant Prototype</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && unread && !unread.authorized && (
        <div className="space-y-2">
          <p>Google is not connected.</p>
          {connectButton}
        </div>
      )}
      {!loading && unread?.authorized && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Unread Messages</h2>
          {unread.list?.messages && unread.list.messages.length > 0 ? (
            <ul className="space-y-2">
              {unread.list.messages.map((message) => (
                <li key={message.id} className="border p-2">
                  <div className="flex items-center justify-between gap-4">
                    <span>{message.id}</span>
                    <button
                      className="border px-3 py-1"
                      onClick={() => analyzeMessage(message.id)}
                      disabled={activeId === message.id}
                    >
                      {activeId === message.id ? 'Analyzing…' : 'Analyze'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No unread messages found.</p>
          )}
        </section>
      )}

      {analysis && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">AI Output</h2>
          <pre className="bg-gray-100 p-3 overflow-auto text-sm">
            {JSON.stringify(analysis.ai, null, 2)}
          </pre>
          {analysis.ai.action === 'create_event' && (
            <button className="border px-3 py-1" onClick={createEvent}>
              Create Calendar Event
            </button>
          )}
          {eventResult && (
            <pre className="bg-gray-100 p-3 overflow-auto text-sm">
              {JSON.stringify(eventResult.event, null, 2)}
            </pre>
          )}
        </section>
      )}
    </main>
  );
}
