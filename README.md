<div align="center">

# 🛡️ Caspian Sentinel AI

**Autonomous Team Operations Platform — Powered by Gemini & Groq Whisper**

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Expo](https://img.shields.io/badge/Expo-SDK%2052-000000?logo=expo)](https://expo.dev)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20%2F%20PostgreSQL-003B57?logo=sqlite)](https://sqlite.org)
[![Tests](https://img.shields.io/badge/Tests-43%20Passed-brightgreen)](/)

</div>

---

## ✨ What is Caspian Sentinel AI?

Caspian Sentinel AI is an **AI-native team operations platform** that lets any admin speak or type a natural-language directive and have it automatically:

- 🔍 **Extract** who, what, and when using **Google Gemini**
- 📋 **Assign** the task to the right team member
- 🗓️ **Schedule** an intelligent deadline from natural language ("by Friday", "kal tak", "tonight")
- 🔔 **Notify** via in-app WebSocket push
- ✅ **Track** acceptance, rejection (with mandatory reason), and completion (with solution log)

All from a mobile-first **Expo / React Native** app — no dashboard login, no spreadsheets.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              Expo Mobile App (RN/TS)             │
│  Home · Calendar · My Team · Profile · Modals   │
└──────────────────────┬──────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────┐
│            FastAPI Backend (Python 3.12)         │
│                                                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Gemini   │  │   Groq    │  │  Supabase    │  │
│  │ AI Router│  │  Whisper  │  │  Auth (OTP)  │  │
│  └──────────┘  └───────────┘  └──────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  SQLAlchemy ORM · SQLite / PostgreSQL    │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Core Features

| Feature | Description |
|---|---|
| 🎤 **Voice-to-Task** | Record voice → Groq Whisper transcribes → Gemini extracts task, assignee & deadline |
| 🤖 **AI Directive Engine** | Text or voice directive auto-assigns tasks to the right team member |
| 📅 **Smart Scheduling** | Understands "by Friday", "kal", "tonight", "in 2 hours" → exact UTC deadline |
| ✅ **Acknowledge & Accept** | Members receive `PENDING_ACK` tasks and must explicitly accept |
| ❌ **Reject with Reason** | Rejection requires a mandatory comment explaining the blocker |
| 🏁 **Resolution Log** | Marking done requires entering how the task was solved (visible to admin) |
| ℹ️ **AI Summary View** | Tap any task card to view the AI-generated problem breakdown & context |
| 👥 **Workspace Isolation** | Each admin gets a unique invite code; members request access |
| 🔔 **Live Notifications** | WebSocket real-time push + persistent in-app notification center |
| 📆 **Calendar View** | Task timeline with overdue carry-over and daily task view |
| 🔐 **Passwordless Auth** | Admin magic link / email OTP via Supabase; member access via team code |

---

## 📁 Project Structure

```
caspian-ai/
├── backend/
│   ├── app/
│   │   ├── main.py            # All FastAPI routes & endpoints
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── database.py        # DB engine + session factory
│   │   ├── teamops.py         # Core team operations logic
│   │   ├── voice_service.py   # Gemini AI + deadline parsing
│   │   ├── supabase_auth.py   # Admin auth with Supabase
│   │   ├── ai_router.py       # Gemini directive routing engine
│   │   ├── caspian_bridge.py  # External channel bridge (Slack/Email)
│   │   ├── tts_service.py     # Text-to-speech helpers
│   │   └── websocket_manager.py # WebSocket broadcast manager
│   ├── tests/                 # 43-test pytest suite
│   ├── requirements.txt
│   └── .env.example           # ← Copy this to .env
│
├── mobile/
│   ├── app/
│   │   ├── index.tsx          # Home / Task Dashboard screen
│   │   ├── calendar.tsx       # Calendar view screen
│   │   ├── plan.tsx           # My Team management screen
│   │   └── _layout.tsx        # Expo Router root layout
│   ├── src/
│   │   ├── api.ts             # All API calls (typed)
│   │   ├── session.ts         # Persistent auth session
│   │   ├── theme.ts           # Design tokens
│   │   └── components/
│   │       ├── AuthModal.tsx
│   │       ├── BottomNav.tsx
│   │       ├── ProfileModal.tsx
│   │       ├── TaskDetailModal.tsx    # AI problem summary view
│   │       ├── TaskRejectModal.tsx    # Rejection + mandatory reason
│   │       ├── TaskCompleteModal.tsx  # Done + solution comment
│   │       └── VoiceAssistantModal.tsx
│   ├── .env.example           # ← Copy this to .env
│   └── app.json
│
├── .env.example               # Root-level env template
├── .gitignore
├── architecture.md
├── flow.md
└── README.md
```

---

## 🛠️ Prerequisites

- **Python 3.12+**
- **Node.js 18+** and **npm**
- **Expo Go** app on your Android or iOS device (for physical device testing)
- API keys: [Google Gemini](https://aistudio.google.com/), [Groq Cloud](https://console.groq.com/), [Supabase](https://supabase.com/) (optional for OTP login)

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/caspian-ai.git
cd caspian-ai
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate          # Linux / macOS
# .venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env and fill in GEMINI_API_KEY, GROQ_API_KEY, etc.
```

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_URL to your backend IP
```

---

## ▶️ Running Locally

### Backend (Terminal 1)

```bash
cd backend
source .venv/bin/activate

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

### Mobile App (Terminal 2)

```bash
cd mobile

# For local web testing:
npm start
# Press 'w' to open in browser

# For physical device testing (replace with your machine's LAN IP):
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000 npx expo start
# Scan QR code with Expo Go app on Android or iOS
```

---

## 🧪 Running Tests

```bash
cd backend
source .venv/bin/activate

# Run full backend test suite (43 tests)
python -m pytest tests -v

# Type-check mobile app
cd ../mobile
npm run typecheck
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite (`sqlite:///./teamops.db`) or PostgreSQL URL |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key (AI extraction & routing) |
| `GROQ_API_KEY` | ✅ | Groq Cloud key (Whisper voice transcription) |
| `SUPABASE_URL` | Optional | Supabase project URL (for admin OTP login) |
| `ANON_KEY` | Optional | Supabase anon key |
| `SERVICE_KEY` | Optional | Supabase service role key |
| `CORS_ORIGINS` | ✅ | `*` or comma-separated allowed origins |
| `EXPO_PUBLIC_API_URL` | ✅ (mobile) | Backend base URL for the mobile app |

> **Note:** Never commit your `.env` file. It is in `.gitignore` by default.

---

## 🔒 Security Notes

- All secrets are loaded from environment variables via `os.getenv()` — never hardcoded
- `.env` files are excluded from git via `.gitignore`
- SQLite database files (`*.db`) are gitignored
- Admin authentication is handled by Supabase Auth (OTP/magic link)
- Member authentication is scoped per workspace via unique team codes

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Open a Pull Request

---

## 📄 Additional Docs

- [`architecture.md`](architecture.md) — System design and component breakdown
- [`flow.md`](flow.md) — Team onboarding and task lifecycle flows
- [`supabase_email_setup.md`](supabase_email_setup.md) — Configure Supabase OTP email templates

---

<div align="center">

Built with ❤️ using **FastAPI**, **Expo**, **Gemini AI**, and **Groq Whisper**

</div>
