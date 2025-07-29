# Phase 2: Communication Layer & Memory Management – Dynamic Prompting + RAG

> Rule references: **Security First**, **Modular Architecture**, **No Massive Files**

## 1. Goals
1. Craft *context-rich* prompts so agents respond with personalised, coherent insights.  
2. Provide agents with **short-term** (session) and **long-term** (lifelong journal) memory.  
3. Guard against prompt-injection & data-leakage.

---

## 2. Prompt Assembler Architecture

```
Edge Function  (analyze-entry)
  ├─ Validate JWT (RLS)              ───────▶ 403 if invalid
  ├─ Fetch user profile & goals      ───────▶ DB read
  ├─ Summarise recent N entries      ───────▶ LLM (Gemini-Flash)
  ├─ RAG: retrieve semantically-similar past entries (pgvector)
  ├─ Compose Dynamic Prompt  ───────▶ "<system> ... <recent_summary/> <rag_snippets/> <user_text/>"
  └─ Call Router / Worker agents
```

### 2.1 Dynamic Context Layers
| Layer | Source | Injected As |
|-------|--------|-------------|
| **Static Instructions** | Version-controlled prompt templates | `<system>` tag |
| **User Goals** | `user_profiles` table | `{{user_goal}}` var |
| **Recent History Summary** | LLM summarisation of last 3 entries | `<recent_summary>` XML |
| **Long-Term Memory (RAG)** | `journal_entries` via pgvector similarity | `<rag_snippets>` numbered list |
| **Chained Outputs** | JSON from previous Worker | Inline JSON block |

> *Prompt Injection Defence*: wrap user-provided text inside `<user_text>`; template instructs model **not** to execute instructions inside this tag.

---

## 3. Short-Term Memory (Conversation Context)
* **Store**: in-memory array on client; echoed back in each request.  
* **Sliding Window**: keep last *k* messages ≤ 4 k-tokens.  
* **Trimming Strategy**: drop oldest assistant messages first ➜ preserves user voice.

```ts
// pseudo-code
const window = messages.slice(-k)
assemblePrompt(window, ...dynamicLayers)
```

---

## 4. Long-Term Memory – RAG Pipeline

### 4.1 Indexing (Write Path)
```mermaid
graph TD
A[New Entry Saved] --> B[Generate gte-small embedding]
B --> C[Insert into journal_vectors(id,user_id,embedding,metadata)]
```
*Runs in Supabase Edge Background Function `index-entry` (queue trigger).*

### 4.2 Retrieval (Read Path)
1. Embed *query text* (current entry).
2. SQL: `select *, embedding <-> $query_embedding as distance order by distance asc limit 5`.
3. Return text + metadata for Prompt Assembler.

### 4.3 Tables
```sql
create table if not exists public.journal_vectors (
  entry_id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  embedding vector(1536) not null,
  metadata jsonb
);
```

---

## 5. Security & Privacy
* **JWT validation** before any DB access (`Security First`).
* **Row Level Security** ensures users access only their vectors.
* **Prompt Sanitisation** – user text wrapped & escaped; template tells model to treat it as data only.
* **Rate Limiting** – 60 edge-function calls / hr / user.

---

## 6. Error Handling & Observability
| Concern | Strategy |
|---------|----------|
| Token budget overflow | Truncate RAG snippets first, then recent summary |
| Embedding failures | Fallback to semantic-lite keyword search |
| Retrieval returns 0 rows | Skip RAG layer; proceed with goals + recent summary |
| Logging | `lib/logger.ts` with `{userId, stage, durationMs}` |

---

## 7. Extensibility
* Swap embedding model → change single `embedText()` util.  
* Introduce additional context (e.g., **dream logs**) by adding new table + retrieval block.
* Prompt templates versioned ⇒ roll back safely.

---

## 8. Implementation Checklist 
- [x] `index-entry` Edge Function – writes pgvector rows.  
- [x] Prompt Assembler inside `analyze-entry`.  
- [ ] Client sliding-window helper (`utils/contextWindow.ts`).  
- [ ] Add dashboard **Memory Insights** cards (in progress).
