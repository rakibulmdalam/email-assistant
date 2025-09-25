export type AiAction = 'create_event' | 'create_task' | 'none';

export interface AiAnalysis {
  summary: string;
  possible_reply: string;
  action: AiAction;
  action_details?: Record<string, unknown>;
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export async function analyzeEmail(subject: string, body: string): Promise<AiAnalysis> {
  const payload = {
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You summarize emails and extract next actions as strict JSON.'
      },
      {
        role: 'user',
        content: `Subject: ${subject}\nBody:\n${body}`
      }
    ]
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getEnv('OPENAI_API_KEY')}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned empty response');
  }

  const parsed = JSON.parse(content);
  return parsed as AiAnalysis;
}
