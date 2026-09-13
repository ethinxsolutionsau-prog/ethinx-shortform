# EthinX Short-Form — Controlled Production Line

> ⚠️ **Security: Never commit `.env`** — `.env` is gitignored (`# .env` in `.gitignore`). Put real keys only in server env (Vercel / Render / Docker secrets) or local `.env` not in git. Use `.env.example` with **placeholder** keys only. **Rotate all old keys now** — DeepSeek, ElevenLabs, OpenAI, Google — because previous `.env.example` with real keys was public (commit `f05f057`). Previous commit was bypassed via push-protection; keys are compromised. Revoke at: DeepSeek platform, ElevenLabs settings, OpenAI dashboard, Google Cloud Console, then update server `.env`.

Business URL IN → Reviewed 4×15s video package OUT. Exactly four 15-second videos: **1. Problem 2. Proof 3. Offer 4. Direct-Response**. Offer: one video **$199** or four for **$550**, no subscription. Isolated from long-form FacelessForge but reuses QA logic.

## Architecture

```
flowchart TD: A[Business URL + campaign goal] --> B[Brand and proof collector] --> C[Campaign brief] --> D[Four-angle script engine] --> E[Storyboard and asset matcher] --> F[Template renderer] --> G[Automated QA] --> H{Release eligible?} --No--> I[Bounded repair] --> G --Yes--> J[Human approval] --> K[Delivery package]
```

**State Machine:** `[*] → Intake → Collecting → BriefReview → Scripting → Storyboarding → Rendering → QualityReview → Repairing (if failed but repairable) → QualityReview → HumanReview (if QA passed) → Approved → Delivered`. `QualityReview → Escalated` if repair limit reached. `HumanReview → Revision → Rendering`. **FAIL CLOSED:** `release_eligible=true` required for download/delivery/publishing.

**Tech Stack:** Next.js 14 App Router + TypeScript + Prisma + Postgres + BullMQ + Redis + FFmpeg (fluent-ffmpeg) + DeepSeek API (mock) + Whisper (mock) + Vertex AI Vision (mock) + S3 or local `/uploads`. Env: `DATABASE_URL`, `REDIS_URL`, `DEEPSEEK_API_KEY`, `VERTEX_KEY`, `ELEVENLABS_KEY`.

## Critical Rules

1. NEVER invent contact details, reviews, prices, guarantees, business claims. Refuse if not verified.
2. Every claim needs provenance: `{claim, source_url, captured_at, verified}`. Every asset needs manifest: `{asset_id, source_url, type, usage:"private_mockup_only" until confirmed, dimensions, quality_score}`.
3. Script engine receives ONLY approved campaign brief.
4. No freeform frame design — deterministic templates only.
5. FFmpeg only for final render.
6. Max 2 auto-repairs then `state=ESCALATED` never `COMPLETED`.

## Quick Start

```bash
git clone https://github.com/ethinxsolutionsau-prog/ethinx-shortform.git
cd ethinx-shortform
npm install
cp .env.example .env  # edit DATABASE_URL etc
npx prisma db push
npx tsx src/lib/seed.ts  # seeds transformation_v1 + 6 future templates
npm run dev  # http://localhost:3001 (3000 is opencode serve)
npm run build && npm start
```

Env `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5433/ethinx_shortform?schema=public"
REDIS_URL="redis://localhost:6379"
DEEPSEEK_API_KEY="mock_for_dev"
VERTEX_KEY="mock_for_dev"
ELEVENLABS_KEY="mock_for_dev"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

Requires: Node 18+, FFmpeg 6.1 (`ffmpeg -version`), Postgres 15, Redis 7.

## Intake

`POST /api/campaigns/create`
```json
{
  "business_url": "https://adelaidedrivewaycleaning.com.au",
  "campaign_goal": "quote_requests",
  "target_location": "Adelaide",
  "target_customer": "homeowners",
  "primary_service": "driveway cleaning",
  "offer": "free quote",
  "output_formats": ["9:16"],
  "asset_permission_confirmed": false,
  "phone": "08 8123 4567",
  "instagram_url": "https://instagram.com/...",
  "landing_url": "https://..."
}
```
Blocks public delivery if `asset_permission_confirmed=false`.

## Pipeline (Build Order — Shortest to Revenue)

1. One vertical transformation template (`transformation_v1`)
2. Manual asset upload (6 slots) `POST /api/jobs/[id]/assets` (form-data `file`)
3. Structured 15s script generation `POST /api/jobs/[id]/scripts`
4. FFmpeg render `POST /api/jobs/[id]/render` → 1080x1920 H264 AAC 30fps ~15s <15MB
5. QA `POST /api/jobs/[id]/qa` (deterministic + Vertex/Whisper mocks)
6. Human approval `POST /api/jobs/[id]/approve` `{decision:"approve"|"revise"|"reject"}`
7. Delivery `POST /api/jobs/[id]/deliver` → zip
8. Website collector `POST /api/jobs/[id]/collect`
9. Automated asset matching `POST /api/jobs/[id]/storyboard`
10. Additional templates (future)

## Template System

Library of 7, MVP is `transformation_v1`:
```json
{
  "template_id": "transformation_v1",
  "aspect_ratio": "9:16",
  "duration": 15,
  "width": 1080, "height": 1920,
  "caption_safe_width": 820,
  "caption_max_lines": 2,
  "logo_zone": "top_right",
  "cta_start": 12,
  "scenes": 5,
  "caption_zones": [{"y":300,"height":120},{"y":1400,"height":200}],
  "font_sizes": {"caption":64,"cta":72},
  "transitions": "crossfade",
  "transition_duration": 0.2,
  "music_duck_db": -28
}
```

## Script Engine (DeepSeek mock)

System prompt: "You receive ONLY approved brief. Return strict JSON for 4 angles. Do not invent. Use only verified_proof."
Timing per video: 0-3s Hook, 3-8s Problem/transformation, 8-12s Proof/offer, 12-15s CTA.
```json
{
  "angle": "problem",
  "duration_seconds": 15,
  "voiceover": "...",
  "scenes": [{"start":0,"end":3,"visual_intent":"dirty driveway close-up","caption":"DRIVEWAY LOOKING TIRED?"}],
  "cta": "Get your free quote",
  "claims_used": []
}
```
Validator rejects: word count >38 or <12, unsupported claims, missing CTA, timeline overflow >15.5, caption >42 chars, invalid JSON.

## Storyboard & Asset Matcher

Priority: 1.Client footage 2.Client-owned website/social 3.Licensed stock 4.AI visual 5.Text-led. Checks: orientation, resolution, subject placement, crop, similarity, duplicates, watermarks, faces/plates, text overlap. Assigns `confidence_score`, flags low confidence.

## QA

Deterministic: file exists/decode, 1080x1920, duration 14.5-15.5s, audio+video streams, no black/frozen, caption overflow, logo safe zone, contact matches intake, CTA >=2.5s, LUFS, no placeholder. Visual (Vertex AI mock): cropped captions, awkward framing, distorted logos, poor contrast, irrelevant imagery, watermarks. Transcript (Whisper mock): transcribe rendered audio compare to approved script.

## Repair

SAFE allow-list: `reduce_font_size, rewrap_caption, move_text_inside_safe_zone, adjust_voice_music_balance, replace_invalid_asset, extend_cta_time, reframe_crop`.
UNSAFE requires approval: `rewriting_claims, changing_offer, inventing_proof, changing_contact, substituting_unapproved_media, removing_disclaimers`. Max 2 attempts → `ESCALATED`.

## UI Routes

- `/` Dashboard — jobs, templates, critical rules
- `/new` Intake form → `POST /api/campaigns/create`
- `/jobs/[id]` Pipeline controls (all steps), assets, scripts, videos, QA, audit log
- `/brief/[id]` Brief Builder — edit structured brief, Save, Approve → SCRIPTING
- `/review/[id]` Approval Gate — video preview (via `/api/renders/[jobId]/[file]`), script, assets+sources, claims+evidence, QA results, repair history, Approve/Revise/Reject, Delivery ZIP

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/campaigns/create` | Intake |
| GET | `/api/jobs` | List jobs |
| GET | `/api/jobs/[id]` | Job detail + relations |
| POST | `/api/jobs/[id]/collect` | Collector |
| POST / GET | `/api/jobs/[id]/brief` | Build/get brief |
| PATCH | `/api/jobs/[id]/brief` | Update brief |
| POST | `/api/jobs/[id]/brief/approve` | Approve brief |
| POST / GET | `/api/jobs/[id]/scripts` | Generate/list scripts |
| POST / GET | `/api/jobs/[id]/storyboard` | Asset match |
| POST | `/api/jobs/[id]/assets` | Manual upload (6 files) |
| GET | `/api/jobs/[id]/assets` | List assets |
| POST | `/api/jobs/[id]/render` | FFmpeg render 4 videos |
| POST / GET | `/api/jobs/[id]/qa` | QA |
| POST | `/api/jobs/[id]/repair` | Bounded repair |
| POST / GET | `/api/jobs/[id]/approve` | Human approval |
| POST | `/api/jobs/[id]/deliver` | Delivery zip (fail-closed) |
| GET | `/api/delivery/[id]` | Download zip |
| GET | `/api/renders/[jobId]/[file]` | Stream mp4/jpg |

## Delivery (fail-closed)

Only if `release_eligible=true` and `state=APPROVED`. Single: `business-name/{final-vertical.mp4, thumbnail.jpg, caption.txt, posting-notes.txt, production-report.json}`. Four-pack: `business-name/{01-problem.mp4,02-proof.mp4,03-offer.mp4,04-direct.mp4, captions.txt, thumbnails/, production-report.json}`. `production-report.json` contains sources, claims, model versions, template version, render settings, QA outcome, human approval timestamp, checksums.

`POST /api/jobs/[id]/deliver` creates `/delivery/<safeName>-<jobId>.zip`. `GET /api/delivery/[id]` streams it.

## Services (versioned JSON)

`src/lib/services/`: `collector.ts`, `briefBuilder.ts`, `scriptEngine.ts`, `assetMatcher.ts`, `renderer.ts`, `qa.ts`, `repairController.ts`, `delivery.ts`, `audit.ts`

All services exchange versioned JSON, log to `AuditLog` (immutable).

## Acceptance

```bash
npx tsx scripts/acceptance.ts
```

Verifies: Input URL → brief approval → 4 scripts validated → storyboard with confidence → FFmpeg 1080x1920 → QA pass/fail → 2 repairs → approval blocks release if not approved → delivery zip correct. Refuses unverified claims. Escalated job cannot be delivered.

Tested via `scripts/acceptance.ts` (direct services) + HTTP pipeline (`curl` on `http://localhost:3001`):

```
INTAKE → COLLECTING → BRIEF_REVIEW → SCRIPTING → STORYBOARDING → RENDERING → QUALITY_REVIEW → HUMAN_REVIEW → APPROVED → DELIVERED
```

Delivery blocked before approval (400), blocked for escalated.

## Do Not Build

Auto social publishing, customer accounts, subscription billing, 30-video queues, trend discovery, analytics dashboards, multiple render engines, unlimited templates, fully autonomous repairs.

First sellable = Business assets + approved brief → four 15s scripts → four template videos → QA → human approval → delivery.

## Prisma

```
DATABASE_URL="postgresql://postgres:fe185a0e9038a29e82f1d9ed84ca44b783139dda190c95c1@localhost:5433/ethinx_shortform?schema=public"
npx prisma db push
npx prisma generate
npx tsx src/lib/seed.ts
```

## FFmpeg Deterministic

Cropping/reframing, sequencing, transitions (cut/0.2s crossfade), Ken Burns on stills, voiceover mixing, music ducking -28db under voice, burned captions in safe zone (820 width, 2 lines), logo top_right, end-card. Output: 1080x1920 H264 AAC 30fps ~15s <15MB. Vertical only for v1. Thumbnails via `ffmpeg -ss 1 -vframes 1`.

## License

Private — EthinX Solutions.
