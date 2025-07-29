# Phase 3: Production Optimization & Scaling – Cost, Latency, Reliability

> Rule references: **Security First**, **Modular Architecture**, **No Massive Files**

## 1. Objectives
1. Minimise LLM spend without sacrificing insight quality.  
2. Keep P95 latency < 3 s for common user actions.  
3. Guarantee reliability via fault-tolerant, asynchronous workflows.

---

## 2. Cost & Latency Levers

### 2.1 Multi-Layer Caching
| Layer | Technique | Store | TTL / Invalidation |
|-------|-----------|-------|--------------------|
| **Semantic Cache** | pgvector similarity ≤ 0.12 → reuse prior insight | `entry_semantic_cache` table (vector, response JSONB) | manual delete when user edits entry |
| **Response Cache** | exact key hash (e.g., `distortion:catastrophizing`) | Upstash Redis | 30 days or on app deploy |
| **HTTP Cache** | `Cache-Control` for static definitions, CDN (Cloudflare) | Cloudflare KV | 1 hour |

> *Cache lookup order*: Response → Semantic → LLM call.

### 2.2 Model Tiering & Routing
| Tier | Model (default) | $ / 1k tokens* | Use-cases |
|------|-----------------|---------------|-----------|
| T0 | Gemini 1.5 Flash | $0.00025 | Router, small classifiers |
| T1 | Claude 3 Haiku | $0.0008 | Emotion & CBT Identifier |
| T2 | Gemini 1.5 Pro | $0.0025 | Theme extraction, dream analysis |
| T3 | Claude 3 Sonnet / GPT-4o | $0.01 | CBT Reframer, long-form synthesis |

`*`Example prices – update via env config.  
The Router picks the cheapest viable tier; fallback escalates cost step-wise on failure.

### 2.3 Prompt Compression
* Automated lint checks fail CI if any prompt > 2 k-tokens.  
* `scripts/compressPrompts.ts` uses Claude 3 Haiku to shrink unused verbiage by ≥ 40 %.

---

## 3. Asynchronous Execution Patterns

### 3.1 `waitUntil` Quick Jobs (≤15 s)
```ts
const handler = async (req: Request, ctx: ExecutionContext) => {
  const job = createAnalysisJob(req);              // insert row
  ctx.waitUntil(runQuickWorkflow(job.id));         // executes Router → Workers chain
  return new Response(JSON.stringify({ jobId: job.id }), { status: 202 });
};
```
*Suitable for short, stateless analyses (summary generation, CBT quick check).*  
Edge Runtime keeps context alive beyond HTTP response.

### 3.2 Job Table + Queue (Long-Running)
1. **Submit** – Edge Function inserts `journal_analysis_jobs` row → returns `jobId`.  
2. **Trigger** – Supabase DB trigger or Upstash QStash pushes message.  
3. **Worker** – `supabase/functions/analyze-worker` fetches job, performs *one* step, updates status JSON, re-queues next step.  
4. **Completion** – final worker writes insights & sets `status = 'completed'`.

Benefits: retry, visibility, horizontal scaling, out-of-order step handling.

---

## 4. Reliability & Observability
* **Retries**: exponential back-off (max 3) for transient LLM 5xx or network errors.  
* **Circuit-breaker**: disable Tier 3 calls if daily spend > budget cap (env `LLM_DAILY_CAP`).  
* **Tracing**: OpenTelemetry spans (`Router`, `Worker:Emotion`, `Cache:Semantic`).  
* **Metrics**: Prometheus scrape via `/metrics` Edge endpoint – cost, tokens, latency.

---

## 5. Model Adapter Layer
Create `lib/llmAdapter.ts`:
```ts
export interface LlmRequest { model: string; messages: ChatMessage[]; tools?: Tool[] }
export async function callLlm(req: LlmRequest) { /* switch-case on model → provider SDK */ }
```
• Keeps codebase model-agnostic – swap Gemini → Claude by env var.  
• Gemini remains default (`process.env.LLM_PROVIDER = 'gemini'`).

---

## 6. Implementation Checklist 
- [x] `entry_semantic_cache` table + pgvector index.  
- [x] Upstash Redis instance for response cache.  
- [x] Router updated to tier-aware model map.  
- [ ] `waitUntil` refactor for quick jobs.  
- [ ] Job queue & worker Edge Function.  
- [ ] `llmAdapter.ts` with provider switch + tests.

---

## 7. Future Enhancements
* **Dynamic Budgeting** – auto-downgrade tier if user’s monthly quota low.  
* **On-device Inference** – Llama 3 8B via MLC-Llama for offline drafts.  
* **Fine-grained Spend Alerts** – Slack & RevenueCat hooks when spend > 80 % of cap.
