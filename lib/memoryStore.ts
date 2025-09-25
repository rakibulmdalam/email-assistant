export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  scope?: string;
  tokenType?: string;
}

const store = new Map<string, GoogleTokens>();

export function getTokens(sessionId: string): GoogleTokens | undefined {
  return store.get(sessionId);
}

export function setTokens(sessionId: string, tokens: GoogleTokens) {
  store.set(sessionId, tokens);
}

export function deleteTokens(sessionId: string) {
  store.delete(sessionId);
}
