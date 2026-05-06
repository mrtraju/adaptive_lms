# Adaptive AI LMS — PRD

## Original problem statement
Build a multilingual (English / Bahasa Melayu / Chinese Mandarin) adaptive LMS with a humanized AI avatar tutor. Curriculum-bound content generation, four tutor personalities, emotion-aware tutoring, rule-based adaptive difficulty, and three role-based dashboards (student / teacher / admin). User wanted to run the app locally with Groq cloud LLM (`llama-3.3-70b-versatile`).

## Architecture
- **Backend**: FastAPI modular monolith with `lifespan` handler, MongoDB (Motor), JWT auth (`python-jwt` + `bcrypt`), Groq via `AsyncGroq`, `cachetools.TTLCache` for intervention cache, `safe_json` retry wrapper for all JSON-mode Groq calls.
- **Frontend**: React 19 + react-router-dom 7 + Tailwind + Shadcn UI, Neo-Brutalist pastel design (Outfit + DM Sans). Dashboards wrapped with `ErrorBoundary`.
- **AI**: Groq `llama-3.3-70b-versatile` for lessons, quizzes, tutor chat (POST + SSE streaming), bilingual Bridge mode, teacher AI interventions, and **Interactive Teach** live teaching loop.

## User personas
- **Student**: avatar picker (with subscription-driven lock/unlock), lesson generation, tutor chat (stream + voice), quiz, **Interactive Teach** live lesson, Bridge mode (premium).
- **Teacher**: curriculum CRUD, student analytics, AI Intervention suggestions (premium).
- **Admin**: platform analytics (users / AI usage by kind / language distribution / plan distribution).

## Implemented
- **iter 1 (MVP)**: auth, curriculum CRUD, lesson gen, quiz + adaptive difficulty, tutor chat, dashboards, Neo-Brutalist UI.
- **iter 2**: SSE streaming chat, voice I/O, PDF print, AI Interventions.
- **iter 3**: `lifespan` handler, intervention cache, short-lived stream tokens (kind=stream, 2 min), Bridge mode, Free/Premium subscription with gating + MOCKED upgrade.
- **iter 4 (latest)**:
  - `cachetools.TTLCache(maxsize=1000, ttl=600)` replaces manual TTL logic.
  - `safe_json` helper — one-retry wrapper for Groq JSON endpoints (lesson, quiz, bridge, intervention, teach).
  - `/api/subscription/me.features.premium_personalities` returned to client (no hardcoding).
  - `/api/subscription/me.features.interactive_teach` flag.
  - React `ErrorBoundary` wraps all protected routes — friendly failure card with Retry / Go Home.
  - **Interactive Teach**: `POST /api/tutor/teach` (step, total_steps, history, student_reply) drives a live teaching loop. Teacher AI is humanised: addresses student by name, reacts to previous answer, teaches one concept per turn, ends each middle turn with a checking question, closes with a recap.
  - Frontend `InteractiveTeach` modal: large avatar portrait, animated "speaking" indicator, progress bar, voice output, mic input, multi-turn dialog.

## Test status (iter 4)
- **Backend**: 56/56 pytest passing.
- **Frontend**: Interactive Teach, free/premium gating, bridge, streaming, interventions all verified on preview URL.

## Accounts (seeded, plans reasserted idempotently on startup)
- admin@lms.com / admin123 (admin, premium)
- teacher@lms.com / teacher123 (teacher, premium)
- student@lms.com / student123 (student, free)

## Prioritized backlog
- **P1**: Wire Stripe Checkout to replace MOCKED upgrade (test key available in pod env).
- **P1**: Merge `PERSONALITIES` + `PREMIUM_PERSONALITIES` into a single `PERSONALITIES = {id: {prompt, premium}}` source of truth.
- **P2**: Drive `ai_by_kind` from a `USAGE_KINDS` constant or a single $group aggregation.
- **P2**: Add Pydantic `Field` constraints on `TeachStepIn.total_steps (ge=5, le=10)` and `history (max_length=50)`.
- **P2**: Per-student lesson history view, teacher notes to students.
- **P3**: Real RL for personalisation (stable-baselines3).
- **P3**: Classroom / seat-based team plan (org_id + invite flow).

## Run locally
1. `cd /app/backend && pip install -r requirements.txt`
2. Set `MONGO_URL`, `DB_NAME`, `GROQ_API_KEY`, `JWT_SECRET` in `backend/.env`.
3. `uvicorn server:app --reload --host 0.0.0.0 --port 8001`
4. `cd /app/frontend && yarn && yarn start` (set `REACT_APP_BACKEND_URL=http://localhost:8001`)
