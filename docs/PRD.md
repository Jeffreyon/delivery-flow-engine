# 📄 PRODUCT REQUIREMENTS DOCUMENT

## Product: Delivery Flow Engine (Web App)

---

# 1. 🧠 Overview

## Purpose

The Delivery Flow Engine is a **simple, open-source logistics web app** that allows users to:

* Create and manage deliveries
* Track delivery lifecycle
* View event history

It is powered by the **Delivery Events Network API** (DEN API).

---

## Core Idea

> This app is a **reference implementation + distribution tool** for your network.

It should:

* Be useful on its own
* Be easy to deploy
* Force usage of your API

---

## Goals (V1)

* Simple delivery management UI
* Backend that integrates with DEN API
* Clean architecture that allows SDK extraction
* Fast setup (developer-friendly)

---

## Non-Goals (V1)

* No advanced analytics
* No multi-user roles
* No billing
* No real-time websockets (polling is fine)
* No offline-first yet

---

# 2. 🏗️ System Architecture

---

## High-Level Structure

```id="arch1"
Frontend (React)
      ↓
Backend (Node.js)
      ↓
Delivery Client Layer (Internal SDK abstraction)
      ↓
DEN API (External)
```

---

## Key Principle

> The backend must NEVER call the API directly.
> It must go through an abstraction layer.

---

## Components

### 1. Frontend

* React / Next.js
* UI for deliveries + events

---

### 2. Backend API (App Server)

* Handles frontend requests
* Uses internal client layer

---

### 3. Delivery Client Layer (VERY IMPORTANT)

This is your **future SDK extraction layer**

Responsibilities:

* Wrap DEN API calls
* Normalize responses
* Handle errors
* Provide simple functions

---

# 3. 🧩 Core Features

---

## 3.1 Create Delivery

User can:

* Create new delivery
* Add metadata (optional)

---

## 3.2 View Deliveries

* List all deliveries
* Show:

  * ID
  * Status
  * Created date

---

## 3.3 Delivery Details

* View:

  * Status
  * Metadata
  * Event timeline

---

## 3.4 Update Delivery (Emit Events)

User can:

* Dispatch
* Mark in transit
* Deliver
* Fail delivery

---

## 3.5 Event Timeline

* Chronological list of events
* Show:

  * Event type
  * Timestamp
  * Payload (optional)

---

# 4. 🎨 Frontend Requirements

---

## Pages

### 1. Dashboard

* List deliveries
* Button: “Create Delivery”

---

### 2. Create Delivery Modal/Page

* Input:

  * External ID (optional)
  * Metadata JSON (optional)

---

### 3. Delivery Details Page

* Status badge
* Action buttons:

  * Dispatch
  * In Transit
  * Deliver
  * Fail
* Event timeline

---

---

## UI Components

* Table (deliveries)
* Status badge
* Timeline component
* Modal form

---

# 5. ⚙️ Backend Design

---

## Key Rule

> Backend must be **decoupled from DEN API implementation**

---

## Folder Structure (IMPORTANT)

```id="backend-structure"
backend/
  ├── routes/
  │     ├── deliveries.ts
  │     ├── events.ts
  │
  ├── services/
  │     └── deliveryService.ts
  │
  ├── clients/
  │     └── deliveryClient.ts   <-- THIS IS YOUR SDK BASE
  │
  ├── types/
  │
  └── config/
```

---

# 6. 🧰 Delivery Client Layer (SDK Foundation)

---

## Purpose

This layer:

* Wraps all external API calls
* Will later be extracted as NPM package

---

## Example Interface

```ts id="client-interface"
class DeliveryClient {
  createDelivery(data): Promise<Delivery>
  getDelivery(id): Promise<Delivery>
  listDeliveries(): Promise<Delivery[]>
  emitEvent(data): Promise<void>
  getEvents(deliveryId): Promise<Event[]>
}
```

---

## Behavior

* Uses API key internally
* Handles HTTP requests
* Normalizes responses

---

## Important Constraint

> NO business logic here
> ONLY API communication + formatting

---

# 7. 🌐 Backend API Endpoints (App)

---

## 7.1 Create Delivery

POST `/api/deliveries`

---

## 7.2 Get Deliveries

GET `/api/deliveries`

---

## 7.3 Get Delivery Details

GET `/api/deliveries/:id`

---

## 7.4 Emit Event

POST `/api/events`

---

## 7.5 Get Events

GET `/api/events?deliveryId=`

---

---

## Flow

Frontend → Backend → Client Layer → DEN API

---

# 8. 🔐 Environment Configuration

---

## Required ENV

```id="env"
DEN_API_URL=
DEN_API_KEY=
```

---

## Behavior

* Backend injects API key into client layer
* Frontend never sees API key

---

# 9. 🗄️ Data Handling

---

## Important Decision

> This app does NOT store deliveries locally

Everything comes from:
→ DEN API

---

## Exception (optional later)

* Caching layer (not V1)

---

# 10. ⚡ UX Flow

---

## Create Delivery

User → frontend form → backend → client → DEN API
→ response → UI update

---

## Update Status

User clicks action → backend → emit event → refresh UI

---

## View Timeline

Frontend → backend → client → events → render

---

# 11. 🧪 Testing

---

## Backend

* Mock client layer for tests
* Test routes independently

---

## Frontend

* Component tests
* Basic flow tests

---

# 12. 🚀 Deployment

---

## Requirements

* Easy `.env` setup
* One command to run

---

## Target

> “Clone → install → run → works in 10 minutes”

---

# 13. 🧠 Design Principles

---

## 1. Simplicity wins

No unnecessary abstractions beyond client layer

---

## 2. API-first thinking

Everything flows through DEN API

---

## 3. Extractability

Client layer must be:
→ portable
→ reusable
→ publishable

---

## 4. Developer Experience

* Clean code
* Minimal setup
* Clear README

---

# 14. 🔥 Future Extensions (DO NOT BUILD YET)

* Multi-user auth
* Webhooks
* Realtime updates
* Offline-first
* Multi-company views


# 🔥 Final Insight

This app is not just a tool.

It is:

> **A Trojan horse for your network API**

Every clone:
→ becomes a node
→ connects to your infrastructure
