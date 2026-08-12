# Application Flows

This document explains how data moves through Caspian TeamOps Sentinel and what a user should observe.

## 1. Task assignment

Input:

```text
Rahul, Monday tak API complete kar dena.
```

```mermaid
sequenceDiagram
    actor Lead as Ali / Team lead
    participant API as POST /chat
    participant Engine as TeamOps engine
    participant DB as Database
    participant App as Agent Inbox
    Lead->>API: Natural-language assignment
    API->>Engine: message + sender + channel
    Engine->>Engine: Extract CREATE_TASK
    Engine->>DB: Resolve Rahul
    DB-->>Engine: Rahul / Backend / user_id
    Engine->>Engine: Convert Monday to exact datetime
    Engine->>DB: Insert PENDING_ACK task
    Engine->>DB: Add history, notification and summary
    Engine-->>API: Task-created response
    API-->>Lead: Structured confirmation
    App->>API: GET /tasks
    API-->>App: Rahul's commitment
```

Stored result:

| Field | Value |
|---|---|
| Owner | Rahul |
| Task | API complete |
| Deadline | Next Monday at 18:00 |
| Status | `PENDING_ACK` |

## 2. Caspian email flow

```mermaid
sequenceDiagram
    actor Lead as Team lead
    participant Mail as Email provider
    participant Caspian as Caspian gateway
    participant Bridge as TeamOps listener
    participant Engine as TeamOps engine
    participant DB as Database
    Lead->>Mail: Send task email
    Mail->>Caspian: Deliver to agent address
    Caspian->>Bridge: Normalized message event
    Bridge->>Engine: text + mapped sender
    Engine->>DB: Validate owner and create task
    DB-->>Engine: Commit successful
    Engine-->>Bridge: Confirmation text
    Bridge->>Caspian: message.reply
    Caspian->>Mail: Reply in original thread
```

The commitment board shows structured task state rather than a raw-email transcript.

## 3. Acknowledgement flow

Rahul replies `Accepted`. Short channel replies require Rahul's address in `CASPIAN_SENDER_MAP`.

```mermaid
flowchart TD
    A["Accepted"] --> B["Resolve sender address"]
    B --> C{"Mapped member?"}
    C -->|"No"| D["Request sender identity"]
    C -->|"Rahul"| E["Find Rahul's earliest active task"]
    E --> F{"Task found?"}
    F -->|"No"| G["No active task response"]
    F -->|"Yes"| H["PENDING_ACK → IN_PROGRESS"]
    H --> I["Write history and summary"]
    I --> J["Reply in original channel"]
```

## 4. Task-board actions

| Action | Behavior |
|---|---|
| Done | Selected task becomes `DONE` |
| Blocked | Selected task becomes `BLOCKED` |
| Help | Assistance is requested and the active task becomes blocked |
| Snooze | Extension is requested; deadline remains unchanged pending approval |

```mermaid
sequenceDiagram
    actor Member
    participant App as Task board
    participant API as FastAPI
    participant DB as Database
    Member->>App: Press Done or Blocked
    App->>API: PATCH /tasks/{id}
    API->>DB: Update task status
    API->>DB: Add history and audit log
    DB-->>API: Updated task
    API-->>App: Updated state
```

## 5. Database-grounded queries

Supported questions:

```text
Aaj team ko kya karna hai?
Rahul ka status kya hai?
Koi blocker hai?
```

```mermaid
flowchart LR
    Q["Team question"] --> I["Classify query intent"]
    I --> DB[("Members + active tasks")]
    DB --> R["Deterministic response builder"]
    R --> A["Plan / status / blockers"]
```

The response builder cannot invent tasks or blockers because it reads current database records.

## 6. Notification flow

```mermaid
flowchart TD
    E["TeamOps event"] --> S{"Severity"}
    S -->|"Normal"| APP["In-app notification"]
    S -->|"Critical blocker"| CRIT["Critical in-app alert"]
    CRIT --> FALLBACK["Caspian fallback in listener context"]
    APP --> UI["Agent Inbox"]
```

Phase 5 will use dependency data to notify only affected people.

## 7. Conversation memory

```mermaid
flowchart LR
    MSG["Inbound message"] --> INTENT["Structured intent"]
    INTENT --> OUTCOME["Database outcome"]
    OUTCOME --> SUMMARY["Compact summary"]
    SUMMARY --> DB[("conversation_summaries")]
```

The MVP stores classified outcomes instead of unbounded raw chat context.

## 8. Safety and error flows

### Unknown owner

If a message assigns work to someone outside the directory, no task is created and the response identifies the missing member.

### Unsupported message

The intent becomes `UNKNOWN`, no task mutation occurs, and the user receives safe guidance.

### Missing sender identity

Assignments can name their owner inside the message. Short updates such as `Accepted` cannot safely select a member without an address mapping.

### Missing Caspian key

FastAPI and the app continue working locally. The Caspian listener exits with a setup error and never uses a fallback credential.

## 9. Five-minute demo

1. Show Rahul, Neha, Sumeet and Ali in the directory.
2. Send `Rahul, Monday tak API complete kar dena.` through Caspian email.
3. Show the `PENDING_ACK` card.
4. Reply `Accepted` as mapped Rahul and show `IN_PROGRESS`.
5. Ask `Aaj team ko kya karna hai?` and show the database-grounded plan.
6. Mark a task blocked and show the risk signal.
7. Phase 5 adds dependency propagation, GitHub CI failure and ContextFence.

