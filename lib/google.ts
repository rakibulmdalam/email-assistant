import { getTokens, setTokens, GoogleTokens } from './memoryStore';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export function buildAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar'
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function getRedirectUri() {
  return `${getEnv('NEXT_PUBLIC_BASE_URL')}/api/auth/google/callback`;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: getEnv('GOOGLE_CLIENT_ID'),
    client_secret: getEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code'
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.status}`);
  }
  const data = await response.json();
  const expiryDate = data.expires_in ? Date.now() + data.expires_in * 1000 : undefined;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiryDate,
    scope: data.scope,
    tokenType: data.token_type
  };
}

async function refreshAccessToken(tokens: GoogleTokens): Promise<GoogleTokens | null> {
  if (!tokens.refreshToken) {
    return null;
  }
  const body = new URLSearchParams({
    refresh_token: tokens.refreshToken,
    client_id: getEnv('GOOGLE_CLIENT_ID'),
    client_secret: getEnv('GOOGLE_CLIENT_SECRET'),
    grant_type: 'refresh_token'
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const expiryDate = data.expires_in ? Date.now() + data.expires_in * 1000 : undefined;
  return {
    accessToken: data.access_token,
    refreshToken: tokens.refreshToken,
    expiryDate,
    scope: data.scope ?? tokens.scope,
    tokenType: data.token_type ?? tokens.tokenType
  };
}

export async function getValidTokens(sessionId: string): Promise<GoogleTokens | null> {
  const tokens = getTokens(sessionId);
  if (!tokens) {
    return null;
  }
  if (!tokens.expiryDate || tokens.expiryDate - Date.now() > 60_000) {
    return tokens;
  }
  const refreshed = await refreshAccessToken(tokens);
  if (!refreshed) {
    return null;
  }
  setTokens(sessionId, refreshed);
  return refreshed;
}

export async function authorizedGoogleFetch(
  sessionId: string,
  url: string,
  init?: RequestInit
): Promise<Response> {
  let tokens = await getValidTokens(sessionId);
  if (!tokens) {
    throw new Error('unauthorized');
  }
  const doFetch = async (accessToken: string) => {
    const headers = new Headers(init?.headers as HeadersInit | undefined);
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, {
      ...init,
      headers
    });
  };
  let response = await doFetch(tokens.accessToken);
  if (response.status === 401 && tokens.refreshToken) {
    const refreshed = await refreshAccessToken(tokens);
    if (refreshed) {
      setTokens(sessionId, refreshed);
      tokens = refreshed;
      response = await doFetch(tokens.accessToken);
    }
  }
  return response;
}
