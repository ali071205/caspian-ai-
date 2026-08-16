# Caspian Sentinel AI

Caspian Sentinel AI is a team operations app for assigning work, managing members, tracking deadlines, and keeping each workspace isolated. Admins can create a workspace and team code; members use that code to request access.

## What it does

- Separate admin and team-member sign-in
- Unique invite code for every workspace
- Admin approval for join requests
- Admin controls to add, remove, and restore members
- Natural-language task assignment
- Private task views for individual members
- Direct member messaging and task assignment
- Calendar scheduling with overdue carry-over rules
- Project delivery history and pending-work view
- Voice-note transcription and task routing
- Live notifications and WebSocket events
- Responsive Expo app for Android, iOS, and web

## Team flow

```text
Admin creates workspace
        ↓
Unique team code is generated
        ↓
Member enters code and requests access
        ↓
Admin approves or rejects request
        ↓
Approved member enters the workspace
```

An admin can also add an approved member directly from **My Team**. Removing a member disables their access without deleting their task and audit history.

## Calendar behavior

- A task appears on its assigned deadline date.
- A completed task does not appear on the following date.
- An incomplete task carries to the next actual day only and displays an overdue warning.
- Future dates do not show an overdue warning before that date arrives.
- Tasks assigned to different dates remain separate.

## Technology

| Area | Stack |
|---|---|
| App | React Native, Expo Router, TypeScript |
| API | FastAPI, Pydantic |
| Database | SQLAlchemy, SQLite/PostgreSQL |
| Authentication | Supabase Auth, email OTP, team codes |
| Realtime | WebSockets, notifications |
| Testing | Pytest, TypeScript compiler |

## Project structure

```text
.
├── backend/
│   ├── app/             # API, models, auth and TeamOps logic
│   └── tests/           # Backend test suite
├── mobile/
│   ├── app/             # Expo Router screens
│   ├── assets/          # App icons and attribution
│   └── src/             # API client, components and theme
├── architecture.md
├── flow.md
└── README.md
```

## Run locally

### Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Interactive documentation is available at `http://localhost:8000/docs`.

### Mobile and web app

```powershell
cd mobile
npm install
npm start
```

Press `w` for the web version or open the project with an Expo-compatible device. For a physical phone, configure `EXPO_PUBLIC_API_URL` with the computer's LAN address.

## Validation

```powershell
cd backend
python -m pytest -q
```

```powershell
cd mobile
npm run typecheck
```

## Configuration

Keep credentials in local environment files and never commit them.

```env
DATABASE_URL=sqlite:///./teamops.db
CORS_ORIGINS=*
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Optional integrations such as Supabase, Gemini, Slack, Caspian, and email require their own environment variables.

## Asset credits

The interface includes free Flaticon assets used with attribution. Full links and author credits are listed in [`mobile/assets/ATTRIBUTION.md`](./mobile/assets/ATTRIBUTION.md).

## Current status

The project is an active MVP. Production hosting, encrypted persistent sessions, native push notifications, and a final security/accessibility audit remain release work.
