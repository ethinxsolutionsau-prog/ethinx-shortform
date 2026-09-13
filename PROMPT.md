BUILD COMMAND: EthinX Short-Form Controlled Production Line - Build in One Go

GOAL: Build a controlled production line: Business URL IN -> Reviewed 4x15s video package OUT. Produce EXACTLY four 15-second videos: 1.Problem 2.Proof 3.Offer 4.Direct-Response. This is the EthinX offer: one video $199 or four for $550, no subscription. Isolate from long-form FacelessForge engine but reuse its QA logic.

ARCHITECTURE TO IMPLEMENT:
flowchart TD: A[Business URL + campaign goal] --> B[Brand and proof collector] --> C[Campaign brief] --> D[Four-angle script engine] --> E[Storyboard and asset matcher] --> F[Template renderer] --> G[Automated QA] --> H{Release eligible?} --No--> I[Bounded repair] --> G --Yes--> J[Human approval] --> K[Delivery package]

STATE MACHINE: [*] --> Intake --> Collecting --> BriefReview --> Scripting --> Storyboarding --> Rendering --> QualityReview --> Repairing (if failed but repairable) --> QualityReview --> HumanReview (if QA passed) --> Approved --> Delivered. QualityReview --> Escalated if repair limit reached. HumanReview --> Revision --> Rendering. FAIL CLOSED: No release_eligible=true means no download, no delivery, no publishing.

TECH STACK: Next.js 14 App Router + TypeScript + Prisma + Postgres + BullMQ + Redis + FFmpeg (fluent-ffmpeg) + DeepSeek API for scripts + Whisper for transcript validation + Vertex AI Vision for visual QA + S3 or local /uploads. Env: DATABASE_URL, REDIS_URL, DEEPSEEK_API_KEY, VERTEX_KEY, ELEVENLABS_KEY.

CRITICAL RULES: 1. NEVER invent contact details, reviews, reviews, prices, guarantees, business claims. Refuse if not verified. 2. Every claim needs provenance: {claim, source_url, captured_at, verified}. Every asset needs manifest: {asset_id, source_url, type, usage:"private_mockup_only" until confirmed, dimensions, quality_score}. 3. Script engine receives ONLY approved campaign brief. 4. No freeform frame design - use deterministic templates only. 5. FFmpeg only for final render. 6. Max 2 auto-repairs then state=NEEDS_REVIEW/ESCALATED never COMPLETED.

INTAKE: POST /api/campaigns/create. Minimum JSON: {business_url, campaign_goal:"quote_requests", target_location:"Adelaide", target_customer:"homeowners", primary_service:"driveway cleaning", offer:"free quote", output_formats:["9:16"], asset_permission_confirmed:false}. Optional: instagram_url, facebook_url, logo upload, customer footage, voice, music, phone, landing url, brand restrictions. Validate and store job. Block public delivery if asset_permission_confirmed=false.

COLLECTOR: Scans website + approved socials. Extracts: logo, brand colours, fonts or licensed substitute, service descriptions, before/after media, testimonials/ratings, locations served, CTA, phone/email/website, offers/differentiators. Save with provenance and asset manifest.

BRIEF BUILDER: Converts collection to structured brief: {business, audience, desired_action, core_service, customer_problem, transformation, verified_proof[], cta, brand_colours[], prohibited_claims[]}. UI at /brief/[jobId] for user correction. State=BriefReview until approved.

SCRIPT ENGINE (DeepSeek): System prompt: "You receive ONLY approved brief. Return strict JSON for 4 angles. Do not invent. Use only verified_proof." Timing per video: 0-3s Hook, 3-8s Problem/transformation, 8-12s Proof/offer, 12-15s CTA. Output: {angle:"problem", duration_seconds:15, voiceover:"...", scenes:[{start:0,end:3,visual_intent:"dirty driveway close-up",caption:"DRIVEWAY LOOKING TIRED?"}], cta:"Get your free quote", claims_used:[]}. Validator rejects: word count too high, unsupported claims, missing CTA, timeline overflow, caption too long, invalid JSON.

STORYBOARD & ASSET MATCHER: Priority: 1.Client footage 2.Client-owned website/social assets 3.Licensed stock 4.AI visual 5.Text-led branded scene. Checks: orientation, resolution, subject placement, crop area, similarity, duplicates, watermarks, faces/number plates, text overlap. Assign confidence_score. Flag low confidence. UI preview before render.

TEMPLATE SYSTEM: Implement library of 7 but build transformation_v1 FIRST for MVP: Before->after, Problem->solution, Testimonial/proof, Three-benefit, Limited offer, Direct CTA, Service montage. Each template defines: {template_id:"transformation_v1", aspect_ratio:"9:16", duration:15, caption_safe_width:820, caption_max_lines:2, logo_zone:"top_right", cta_start:12, scenes:5, caption zones, font sizes, transitions, music/voice levels, end-card, platform margins}.

RENDERER: FFmpeg deterministic: cropping/reframing, sequencing, transitions (cut/0.2s crossfade), Ken Burns on stills, voiceover mixing, music ducking -28db under voice, burned captions in safe zone, logo placement, end-card. Output: 1080x1920 H264 AAC 30fps ~15s <15MB. Vertical only for v1.

QA: Deterministic: file exists/decode, correct res/aspect, duration 14.5-15.5s, audio+video streams, no black/frozen frames, no caption overflow, logo safe zone, contact matches intake, CTA >=2.5s readable, music not over speech (LUFS), no missing/placeholder assets. Visual (Vertex AI): cropped captions, awkward framing, distorted logos, poor contrast, irrelevant imagery, watermarks, unprofessional composition, brand inconsistency. Transcript: Whisper transcribe rendered audio compare to approved script - block if meaningful diff.

REPAIR: SAFE allow-list: reduce font size, rewrap caption, move text inside safe zone, adjust voice/music balance, replace invalid asset with next approved match, extend CTA time, reframe crop. UNSAFE requires approval: rewriting claims, changing offer, inventing proof, changing contact, substituting unapproved media, removing disclaimers. Max 2 attempts.

APPROVAL GATE: /review/[jobId] shows video preview, script, assets+sources, claims+evidence, QA results, repair history, Approve/Revise/Reject. Only Approve sets release_eligible=true.

DELIVERY: Only if release_eligible=true. Single: business-name/{final-vertical.mp4, thumbnail.jpg, caption.txt, posting-notes.txt, production-report.json}. Four-pack: business-name/{01-problem.mp4,02-proof.mp4,03-offer.mp4,04-direct.mp4, captions.txt, thumbnails/, production-report.json}. production-report.json must contain sources, claims, model versions, template version, render settings, QA outcome, human approval timestamp, checksums.

SYSTEM BOUNDARIES - Build as services exchanging versioned JSON: Intake, Collector, Brief Builder, Script Engine, Asset Matcher, Template Engine, Renderer, QA Service, Repair Controller, Approval Service, Delivery Service, Audit Store (immutable log).

BUILD ORDER (shortest to revenue): 1.One vertical transformation template 2.Manual asset upload (6 slots) 3.Structured 15s script generation 4.FFmpeg render 5.Caption/audio/media QA 6.Human approval 7.Delivery pack 8.Website collector 9.Automated asset matching 10.Additional templates.

DO NOT BUILD: auto social publishing, customer accounts, subscription billing, 30-video queues, trend discovery, analytics dashboards, multiple render engines, unlimited templates, fully autonomous repairs. First sellable version = Business assets + approved brief -> four 15s scripts -> four template videos -> QA -> human approval -> delivery.

ACCEPTANCE: Input URL -> brief approval -> 4 scripts validated -> storyboard with confidence -> FFmpeg 1080x1920 -> QA pass/fail -> 2 repairs -> approval blocks release if not approved -> delivery zip correct. Refuses unverified claims. Escalated job cannot be delivered. Build repo, install deps, implement all UI routes /new /jobs/[id] /brief/[id] /review/[id] and APIs, seed transformation_v1, make runnable with npm run dev.
