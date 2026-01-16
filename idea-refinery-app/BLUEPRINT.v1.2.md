# BLUEPRINT ARCHITECT v1.2: IDEA REFINERY

**Role:** Principal Systems Architect & Cost-Conscious Technical Strategist.
**Scope:** Idea Refinery - Self-Hosted Application Builder & Refiner.
**Date:** 2026-01-16
**Version:** 1.2

---

## PART 0: CLASSIFICATION & VISION

**Project Type:** Hybrid (Web App + Native iOS + Self-Hosted Backend)
**Design Archetype:** **Developer Tool — Technical Credibility with Premium Polish**
*Rationale:* Dark mode default, premium black/gold aesthetic, high-density information, geared towards power users who want ownership of their data.

**Core Philosophy:** "The Golden Vault for your Intellectual Property."
A distraction-free, premium environment where ideas are refined into execution-ready specs using your own API keys and storage.

| Assumption | Rationale |
|------------|-----------|
| **Self-Hosted Core** | User runs backend on Proxmox/Docker. Data is sovereign. |
| **Unified Identity** | One account (server-side) accesses data on Web and iOS. |
| **Local-First Sync** | App works offline (Dexie.js), syncs when online. |
| **BYO-Intelligence** | User provides API Keys (Anthropic/OpenAI/Gemini). |
| **Email Capability** | System can email generations via Resend. |

---

## PART 1: FOUNDATION

-   **Core Function:** A premium, self-hosted workspace that refines raw ideas into technical blueprints and executable code using multi-provider AI agents.
-   **Success Metrics:**
    1.  **Onboarding Velocity:** New user to "Ready to Refine" (with API key) in < 60 seconds.
    2.  **Sync Reliability:** 100% data consistency between Desktop and iOS via unified account.
    3.  **Customizability:** User can modify the "Brain" (Prompts) without code changes.
-   **User Personas:**
    | Type | Need | Primary Action |
    | :--- | :--- | :--- |
    | **The Architect** | Control, Privacy, Speed | Refining Ideas, Tweaking System Prompts, Syncing to Mobile |

---

## PART 2: TECH STACK (Cost-Optimized)

**Constraint:** Maximize self-hosting, minimize SaaS costs.

| Layer | Recommended | Notes |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite (Tailwind v4) | Unified codebase for Web. |
| **Mobile** | Capacitor (iOS) | Wraps React app for native feel. |
| **Backend** | Node.js / Express (Docker) | Self-hosted on Proxmox. |
| **Database** | PostgreSQL 15 (Docker) | Persistent storage for sync. |
| **Local Data** | Dexie.js (IndexedDB) | Offline-first cache. |
| **Email** | **Resend** (Free Tier) | SMTP/API for delivery. |
| **Auth** | JWT (Server) + PIN (Local) | Simple, robust, owner-controlled. |

---

## PART 3: DESIGN SYSTEM (Refined)

**Archetype:** "The Vault" — Secure, Precious, Precise.

**Palette:**
-   **Background:** Deepest Zinc (`#09090b`) - NOT pure black, rich darkness.
-   **Accent:** Muted Gold (`#d4af37`) - Used sparingly for high-value actions.
-   **Surface:** Glassmorphism with subtle noise texture.
-   **Text:** Inter (UI) + JetBrains Mono (Code/Prompts).

**Components:**
*   **The Cylinder:** Onboarding flow that "unlocks" the app one step at a time.
*   **Prompt Studio:** specialized editor for system prompts with diff-view logic.
*   **Input Stage:** Focused, breathing textarea.
*   **Artifact Cards:** Masonry layout for History.

---

## PART 4: INFORMATION ARCHITECTURE

```
/
├── / (Home)               # If auth: Input Stage. If new: Onboarding.
├── /login                 # Server Login
├── /lock                  # Local PIN Lock
├── /onboarding            # First-time setup (API Keys, Server URL)
├── /history               # Grid of past refinements
│   └── /history/:id       # View specific refinement
├── /prompts               # [NEW] Prompt Studio (Edit System Prompts)
├── /settings              # Global Config, Data Retention, Email Settings
└── /blueprints            # (Future) Dedicated view for generated specs
```

**Nav Logic:**
*   **Mobile:** Bottom Tab Bar (New | History | Prompts | Settings).
*   **Desktop:** Persistent Sidebar (Collapsible).

---

## PART 5: PAGE SPECIFICATIONS

### 1. Onboarding Flow (The Unlocking)
*   **Goal:** Force configuration of at least ONE valid API Key and Server Connection before app usage.
*   **Steps:**
    1.  **Welcome:** "Open the Vault".
    2.  **Key:** Input OpenAI/Anthropic/Gemini Key (Validates immediately).
    3.  **Sync:** Input Server URL + Login with default Admin credentials.
    4.  **Security:** 
        *   Prompt to change default Admin Password immediately.
        *   Set Local PIN (Becomes the primary way to "unlock" the app daily).
    5.  **Finish:** "Vault Unlocked".

### 2. Input Stage (Refinery)
*   **Job:** Capture intent.
*   **Enhancement:** Quick-select System Prompt (e.g., "Strict Architect" vs "Creative Dreamer").

### 3. Prompt Studio [NEW]
*   **Job:** View and Edit the internal prompts used for Questions, Blueprints, and Mockups.
*   **UI:** Code editor style.
*   **Storage:** Saves to `settings` table (synced). Overrides default `prompts.js`.
*   **Features:** "Reset to Default" button.

### 4. History Vault
*   **Job:** Browse & Manage.
*   **Action:** "Email to Me" button on every artifact (uses Resend).

### 5. Settings
*   **Additions:** 
    *   **Resend API Key:** Input field.
    *   **Test Email:** "Send Test Email" button.

---

## PART 6: DATA LAYER (Updates)

**Schema Updates (PostgreSQL & Dexie):**

**Table: `prompt_overrides`**
*   `id` (PK)
*   `type` (text): 'questions', 'blueprint', 'mockup', 'refine'
*   `content` (text): The prompt template.
*   `updated_at` (timestamp)

**Logic:**
*   **Seeding:** On server init, if `prompt_overrides` is empty, populate it with current constants from `src/lib/prompts.js` (Server must have a copy or shared ref).
*   **Runtime:** App checks `prompt_overrides` first. If missing (offline/no sync), falls back to local `src/lib/prompts.js`.

---

## PART 7: INTEGRATIONS & LOGIC

### Email Integration (Resend)
*   **Endpoint:** `POST /api/email/send` (Server-side proxy to keep key secure? OR Client-side if key is user-provided).
    *   *Decision:* Client-side config stored in Settings (Local/Synced) is easier for self-hosted context where user brings their own Resend key.
    *   *Flow:* User saves Resend API Key in Settings -> App uses it to send emails.

### Unified Account Sync
*   **Login Flow:**
    *   Mobile App starts -> Checks for `authToken`.
    *   If missing -> Redirect to `/login`.
    *   Login -> Returns JWT & User Profile.
    *   **Seed Check:** Server ensures default prompts are loaded in DB.
    *   App pulls latest `settings` and `prompt_overrides`.
    *   *Decision:* **Sync Encrypted API Keys** via the Server so user doesn't type sk-proj-... on iPhone.
    *   *Mechanism:* Encrypt keys with a user-derived secret (or just HTTPS transport security + server storage). For simplicity in v1.2: Sync them plain text over HTTPS (User assumes risk of self-hosted admin), OR keep them local.
    *   *Chosen Path:* **Sync Settings Table** (including Keys).

### Smart Context Optimization (Token Saver)
*   **Problem:** Long conversations burn tokens exponentially.
*   **Solution:** "Sliding Window + Summary"
    *   **Window:** Keep only last 6 messages in the immediate prompt.
    *   **Compression:** When conversation > 8 messages, the app triggers a "Silent Pass" (using a cheap model like GPT-4o-mini or Gemini Flash) to summarize the oldest messages into a concise `Project Context` note.
    *   **Injection:** This summary is injected into the System Prompt, allowing the specific message history to be dropped while retaining the "Memory".

---

## PART 8: ASSETS CHECKLIST

| Asset | Status | Notes |
| :--- | :--- | :--- |
| **Logos** | [x] | `idea-refinery-logo.svg` |
| **Resend** | [ ] | Need API Key input in Settings |
| **Icons** | [x] | Lucide React |

---

## PART 9: V2 BACKLOG
*   **Vector Search:** Add `pgvector` to Postgres.
*   **Public Share:** "Publish Blueprint" to a public URL.
