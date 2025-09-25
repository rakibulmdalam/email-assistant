# AI Email Assistant Prototype

This is a minimal Next.js 14 (App Router) prototype that connects to a single Google account, reads unread Gmail messages, summarizes them with OpenAI, and proposes follow-up actions such as calendar events.

## Features
- Google OAuth2 sign-in (Gmail + Calendar scopes) with in-memory token storage per session cookie.
- API routes for listing unread Gmail messages, fetching and analyzing a message with OpenAI, and creating Google Calendar events.
- Client UI to display unread message IDs, trigger AI analysis, inspect JSON output, and create suggested events.
- Tokens are never sent to the browser and are cleared on server restart.

## Environment Variables
Create an `.env` file from the template and provide valid credentials.

```
cp .env.example .env
```

Required values:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth credentials with Gmail and Calendar scopes.
- `NEXT_PUBLIC_BASE_URL`: Base URL that Google redirects back to (e.g. `http://localhost:3000`).
- `AZURE_OPENAI_ENDPOINT`: Base URL of your Azure OpenAI resource (e.g. `https://example-openai.openai.azure.com`).
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API key.
- `AZURE_OPENAI_DEPLOYMENT`: Name of the chat completion deployment (e.g. a `gpt-4o-mini` deployment).
- `AZURE_OPENAI_API_VERSION` (optional): Overrides the default `2024-02-15-preview` API version.

## Development
```
npm install
npm run dev
```

Visit `http://localhost:3000`, click **Connect Google**, and follow the consent flow. Once connected, unread messages appear with an **Analyze** button that triggers the AI workflow.

## Notes
- Prototype only: tokens live in memory and vanish when the server restarts.
- The OAuth consent screen must include the Gmail and Calendar scopes listed above.
- OpenAI usage costs may apply.

## How to run
1. `cp .env.example .env` and fill in real credentials.
2. `npm i`
3. `npm run dev`
4. Open the app, click “Connect Google”, then test the flow.
