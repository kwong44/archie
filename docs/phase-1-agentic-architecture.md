# Phase 1: Agentic Architecture – Router-Worker Pattern

> Rule references: **Security First**, **Modular Architecture**, **No Massive Files**

## 1. Why Move Beyond a Sequential Pipeline?
Traditional NLP pipelines apply the **same** fixed sequence of steps to every journal entry, regardless of the user’s context or goals.  To deliver *personalised* guidance we instead adopt an **agentic system** where each request is handled by a team of specialised AI agents that collaborate dynamically to reach a goal (insight & gentle coaching).

---

## 2. High-Level System Overview

```
+-------------------+        HTTP        +-------------------+
|  Expo Front-End   |  ───────────────▶ |  Edge Function    |
|  (React Native)   |  POST /analyze    |  analyze-entry    |
+-------------------+                   |  (Orchestrator)   |
                                         +---------┬---------+
                                                   ▼
                                         +-------------------+
                                         |   Router Agent    |
                                         +---┬--------┬-----+
                                             │        │            (invoked in parallel where safe)
      ┌──────────────────────────────────────┼────────┼─────────────────────────────────────────┐
      ▼                                      ▼        ▼                                         ▼
+--------------+  +-----------------+  +--------------+  +-----------------+
| Emotional    |  | Thematic        |  | CBT          |  | CBT             |
| Analyst      |  | Analyst         |  | Identifier   |  | Reframer        |
+--------------+  +-----------------+  +--------------+  +-----------------+
      └──────────────────────────────────────────────────────────────────────┘
                               ▼
                        +--------------+
                        | Synthesiser  |
                        +--------------+
```
*The **Router Agent** decides which Worker Agents to activate based on the entry content & user profile.*

---

## 3. Primary User Stories Supported (new)
1. **Emotion Insight** – *“As a user, I want the AI to recognise nuanced emotions in my writing so I can understand my feelings.”*
2. **Theme Tracking** – *“As a user, I want recurring life themes surfaced so I can spot long-term patterns.”*
3. **CBT Coaching** – *“As a user, I want limiting thoughts identified and gently reframed to healthier perspectives.”*
4. **Adaptive Analysis** – *“As a user, I want the AI to focus on goals I set (e.g. reducing self-criticism).”*

---

## 4. Core Components

### 4.1  Orchestrator (Edge Function `analyze-entry-agentic`)
* **Location:** `supabase/functions/analyze-entry-agentic/index.ts`
* **Framework:** [LangGraph](https://github.com/langchain-ai/langgraph) style graph executed in a Supabase Edge Function.
* **Responsibilities**  
  1. Validate JWT (`Security First`).  
  2. Pass entry text + user context into Router Agent.  
  3. Manage parallel execution of selected Worker Agents (Promise.all).  
  4. Persist Worker outputs (`insights` table) and return a synthesised JSON payload.

### 4.2  Router Agent
* **Model Tier:** Gemini 1.5 Flash (cheap & fast).  
* **Prompt:** Few-shot classifier that outputs:
```jsonc
{
  "invoke": ["emotion", "theme", "cbt_id", "cbt_reframe"],
  "reasoning": "Entry contains …"
}
```
* **Fallback:** If Router fails, Orchestrator defaults to *Emotion* + *Theme* workers.

### 4.3  Worker Agents
| Agent | Purpose | Prompt Notes | Model |
|-------|---------|-------------|-------|
| **EmotionalAnalystAgent** | Detect primary/secondary emotions + intensity using Plutchik | 3-shot JSON examples | Claude 3 Haiku |
| **ThematicAnalystAgent** | Extract key themes & embed via `pgvector` | Uses `supabase-js` RLS | Claude 3 Haiku |
| **CBTIdentifierAgent** | Classify cognitive distortions | Static knowledge-base in prompt | Claude 3 Haiku |
| **CBTReframerAgent** | Generate empathetic reframe | Dynamic prompt (includes quote & distortion) | Claude 3 Sonnet |

> **Persistence:**  
> *Themes* & *Embeddings* → `journal_themes` (id, user_id, entry_id, theme, embedding vector).  
> *Insights* → `entry_insights` (entry_id FK, emotions JSONB, themes JSONB, cbt JSONB).

### 4.4  Synthesiser
Combines Worker outputs into a single structured response consumed by the front-end `app/(tabs)/entries.tsx`.

---

## 5. Front-End Integration

### 5.1  API Client
* **File:** `lib/aiApiClient.ts`  
* **Key Points**  
  * Singleton pattern – re-uses Supabase session JWT.  
  * `post('/api/analyze-entry', { text })` returns typed `AnalyzeEntryResponse` exported from `types/ai.ts`.  
  * Handles 401/422/500 per **Standardised Error Responses** rule.

### 5.2  Reframe Screen (`app/reframe.tsx`)
* Continues to call `generate-summary` Edge Function for *immediate* reflection.  
* Saving a session triggers **analyze-entry** for deep analysis & stores results for dashboards.

---

## 6. Database Notes
```sql
-- Enable pgvector for semantic search
create extension if not exists vector;

-- Journal Themes table
create table if not exists public.journal_themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  entry_id uuid references public.journal_entries(id) on delete cascade,
  theme text not null,
  embedding vector(1536) not null
);

-- Insights table
create table if not exists public.entry_insights (
  entry_id uuid primary key references public.journal_entries(id) on delete cascade,
  emotions jsonb,
  themes jsonb,
  cbt jsonb,
  created_at timestamptz default now()
);
```
*Row-Level Security* enforced per **RLS** rule.

---

## 7. Error Handling & Observability
* **Structured Logging** (`lib/logger.ts`) with context `{ userId, function, agent }`.
* **Rate Limits:** 3 analyses / minute / user (Supabase Function Guards).
* **Graceful Degradation:** If any Worker fails, result array marks error and Synthesiser excludes that section.

---

## 8. Performance & Cost Optimisations
1. **Parallel Workers** – Promise.all.  
2. **Model Tiering** – Gemini-1.5-flash for classify/extract, Gemini-2.0-flash for generation.  
3. **Caching** – Redis edge cache for identical Emotion analyses (rare but cheap safeguard).

---

## 9. Future-Proofing
* Plug-in new Worker Agents (e.g., *Values Alignment*, *Strengths Finder*) by simply adding a node to the LangGraph config.
* Replace models with local Llama 3 8B when on-device inference becomes feasible.

---

## 10. Implementation Checklist 
- [x] Edge Function **generate-summary** (existing) – *Refactor prompt to use buildGeminiPrompt()*
- [x] Edge Function **analyze-entry-agentic** – *Created with Router-Worker orchestration*
- [x] **aiApiClient** – Updated with `/api/analyze-entry-agentic` & strong typing
- [ ] Dashboard UI – Display emotional & thematic trends (in progress)
