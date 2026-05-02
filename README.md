# Analytics GPT Chat UI

A clean, minimal chat interface for the Analytics GPT backend.

## Tech Stack
- **Frontend**: React 18 + Vite (no heavy UI library, pure CSS)
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Qdrant
- **Model**: Qwen 2.5 7B Instruct Q4 via llama.cpp
- **Embeddings**: BGE-small via sentence-transformers

## Getting Started

```bash
cd AnalyticsGPT-UI
cp .env .env
npm install
npm run dev
```

Open http://localhost:5173

## Environment

Edit `.env`:
```
VITE_API_URL=http://localhost:8000
```

## Backend Endpoints Required

The UI expects these FastAPI endpoints. Add them to your existing backend:

### Auth
```
POST /auth/register   body: { username, email, password }
                      returns: { message }

POST /auth/login      body: { email, password }
                      returns: { user_id, username, access_token }
```

### Chat (already in your chat.py)
```
POST /chat/start?user_id={id}           header: X-API-Key
POST /chat/end?session_id={id}          header: X-API-Key
WS   /chat/ws/{session_id}
```

### History (already in your mcp_service.py)
```
GET  /chat/sessions?user_id={id}        header: X-API-Key
GET  /chat/session/{session_id}/messages header: X-API-Key
```

## File Structure

```
src/
  App.jsx                   # routing
  context/AuthContext.jsx   # auth state + session management
  services/api.js           # all HTTP + WS calls
  hooks/useWebSocket.js     # WS connection hook
  pages/
    LoginPage.jsx
    SignupPage.jsx
    ChatPage.jsx
  components/
    Sidebar.jsx             # session history list
    Header.jsx              # model name + connection status
    MessageList.jsx         # messages + typing indicator
    ChatInput.jsx           # auto-resize textarea
  index.css                 # all styles (no Tailwind needed)
```

## Notes

- The WS hook auto-connects when `sessionId` is available
- Messages containing triple-backtick code blocks are rendered with syntax highlighting
- Token counts from your LLM `generate()` response are shown per message
- Dark mode is automatic via `prefers-color-scheme`
- Sessions are persisted in `localStorage` and restored on page refresh
