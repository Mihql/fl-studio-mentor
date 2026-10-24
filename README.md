# Mentor Studio — FL Studio Learning Workspace

A responsive React/Vite frontend with an Express API for a real, streaming AI producer mentor. The app includes seven practical lessons, profile editing, lesson completion, local saved notes, local chat history, and a dark studio-console interface.

## Requirements

- Node.js 20+ (tested syntax with Node 22)
- An OpenAI API key for live mentor responses
- Network access to install npm dependencies and call the OpenAI API

## Run locally

1. Extract this folder.
2. Open a terminal in the project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create your local environment file:

   **Windows PowerShell**
   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

   **macOS/Linux**
   ```bash
   cp .env.example .env
   nano .env
   ```

5. Set `OPENAI_API_KEY` in `.env`. Optionally set `OPENAI_MODEL` (default: `gpt-4.1-mini`). Keep `.env` private; it is git-ignored.
6. Start both app and API:

   ```bash
   npm run dev
   ```

7. Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

For production, run `npm run build` then `npm start`. The Express server serves the built client and API on port `8787` by default. Set `PORT` if needed.

## What's included

- Overview dashboard with progress and practice focus
- Seven detailed FL Studio lessons across mixing, songwriting/arrangement, and workflow
- Lesson search and category filters
- Lesson completion tracking
- Editable learner profile and goals
- Streaming AI chat using the OpenAI Chat Completions streaming API
- Saved insight notes and chat history persisted in browser `localStorage`
- Health endpoint at `/api/health`
- Responsive desktop/mobile navigation

## Real API behavior

The mentor endpoint is `POST /api/mentor`. It streams model tokens from OpenAI to the browser using Server-Sent Events. It does not return canned answers. If `OPENAI_API_KEY` is missing, the endpoint returns HTTP 503 with setup instructions. Provider errors are surfaced to the UI.

## Persistence and security notes

- Learner profile, completed lessons, notes, and chat history are stored in the current browser's local storage. They are not synced across browsers/devices and are not encrypted as a database would be.
- The API key stays on the server and is never sent to the browser.
- This is a local-first starter, not yet a multi-user hosted service. Before public deployment, add authentication, per-user server-side storage, request rate limiting, quotas, and stricter operational logging policies.
- Never commit `.env` or expose API keys in screenshots or source control.

## Verification status

- `server/index.js` passes Node's syntax check.
- Dependency installation/build could not be completed in the authoring environment because `npm install` timed out while fetching packages. Run `npm install` and `npm run build` in an environment with npm registry access before treating the build as verified.
