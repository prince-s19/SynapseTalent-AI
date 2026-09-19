# SynapseTalent-AI
AI-Powered Continuous Talent Intelligence &amp; Internal Mobility Platform

**Where Hidden Skills Meet Hidden Opportunities**
Internal talent intelligence platform · 

 Live demo

[SynapseTalent AI Live Demo](https://genindianai.lovable.app)
---

## 1. Executive Summary

SynapseTalent.ai is an internal talent-intelligence platform that discovers the skills an
employee has but never declared, matches those skills to internal roles, explains every match
with evidence, quantifies skill gaps, generates a learning roadmap, and lets the employee
simulate how learning new skills would change their projected role readiness.

Two distinct workspaces are implemented:

- **Employee workspace** — profile editing (picture, bio, career goal, public profile links),
  AI insights, hidden skills, recommended internal roles, career simulator, AI career
  assistant, industry trends, recognitions and HR reports, PDF download.
- **HR workspace** — talent directory, candidate workspace with an *honest* public-link
  analysis, recognition badges, reports to employees, and an internal mobility pipeline
  (Identified → Contacted → Responded → Interviewing → Placed).

Every number in the product is produced by a deterministic, published formula. The system does
**not** claim graph neural networks, SHAP, or federated learning — none are implemented, and the
UI language reflects that ("evidence-based AI explanation", "projected role readiness").

---

## 2. High-Level Architecture

```text
                         ┌─────────────────────────────────────────┐
                         │             BROWSER (React 19)          │
                         │  TanStack Router routes · shadcn/ui     │
                         │  Recharts · Lucide · TanStack Query     │
                         └───────────────┬─────────────────────────┘
                                         │  typed RPC (createServerFn) + PostgREST
                    ┌────────────────────┴────────────────────┐
                    │                                         │
        ┌───────────▼────────────┐              ┌─────────────▼──────────────┐
        │  SERVER FUNCTIONS      │              │   SUPABASE (Lovable Cloud) │
        │  (edge runtime)        │              │   Postgres + RLS + Auth    │
        │                        │              │   private avatars bucket   │
        │  analyzeEmployee       │  service key  │                            │
        │  generateRoadmap       ├──────────────►│  17 tables, row-level      │
        │  careerAssistant       │               │  security, role helper     │
        │  enrichProfile         │               │  has_role(uid,'hr')        │
        │  analyzeProfileLinks   │               └────────────────────────────┘
        │  getIndustryTrends     │
        └───┬──────────┬─────────┘
            │          │
    ┌───────▼───┐  ┌───▼──────────┐   ┌──────────────┐
    │ Lovable AI│  │ Apify (opt.) │   │ Firecrawl    │
    │ Gemini    │  │ GitHub /     │   │ industry     │
    │ gateway   │  │ LinkedIn /   │   │ trend search │
    └───────────┘  │ portfolio    │   └──────────────┘
                   └──────────────┘
```

Key architectural rules enforced in code:

- All third-party keys (`LOVABLE_API_KEY`, `APIFY_API_KEY`, `FIRECRAWL_API_KEY`, service role)
  are read **inside server handlers only** — never shipped to the browser.
- Every external integration is wrapped so a failure degrades to demo data instead of breaking
  the flow (`scrapePublicUrl` never throws; trends fall back to a curated list).
- Deterministic scoring lives in shared pure modules (`matching.ts`) used identically by the
  live match view, the HR analysis, and the Career Simulator.

---

## 3. Primary Workflow (Judge Demo Flow)

```text
Dashboard (Priya Sharma, demo employee)
   │
   ├─► "Analyze Skills"  ──► server fn analyzeEmployee
   │        loads declared skills, projects, certifications, consented enrichment
   │        Gemini extracts direct / hidden / transferable skills
   │        hard rule: every skill needs source + evidence + confidence
   │        persists employee_skills  ──► recomputes role_matches
   │
   ├─► "AI Discovered Hidden Skills" cards (evidence, source, confidence band)
   │
   ├─► Recommended Internal Roles  ──► /role/:id
   │        Why you're a match · Strengths · Transferable skills
   │        Skill gaps (current vs required) · Recommended next steps · Evidence
   │
   ├─► "Build My Career Plan"  ──► generateCareerRoadmap
   │        month-by-month plan derived from the actual identified gaps
   │        final step: internal opportunity readiness review
   │
   └─► Career Simulator
            toggle skills to "learn" (e.g. MLOps, Docker) + target proficiency
            recalculates projected readiness for all roles, before/after chart,
            newly unlocked roles, recommended learning path
```

HR flow: `/hr` → search directory → open candidate workspace → **Analyse profile links**
(scrapes only the employee's saved public URLs; reports honestly what was found, what was not,
and "insufficient evidence" where a link yields nothing) → award recognition → send report →
add to pipeline → send internal mobility message → track the employee's reply.

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start v1 (React 19, SSR + server functions), Vite 7 |
| Language | TypeScript (strict, `tsgo --noEmit` clean) |
| UI | Tailwind CSS v4, shadcn/ui, Lucide icons, Recharts, custom SVG skill graph |
| State / data | TanStack Query (query keys per entity, invalidation on mutation) |
| Backend | Lovable Cloud (Supabase Postgres, Auth, Storage), server functions on edge runtime |
| AI | Gemini via the Lovable AI gateway (server-side only) |
| Enrichment | Apify connector — `apify~website-content-crawler`, `harvestapi~linkedin-profile-scraper` (no-email mode) |
| Trends | Firecrawl connector (v2 search) + Gemini summarisation, 12-hour cache, curated fallback |
| PDF | jsPDF client-side report generator |

---

## 5. Database Design

17 tables, all in `public` with RLS enabled and explicit grants.

**Core talent model**
`employees` (profile, career goal, `job_title`, public links: github/linkedin/slack/portfolio/website) ·
`skills` (48 catalogue skills) · `employee_skills` (proficiency, confidence, source, evidence,
skill_type direct/hidden/transferable) · `projects` (tech stack, role, evidence URL) ·
`roles` (12 internal roles with `required_skills` / `nice_to_have_skills` JSONB) ·
`role_matches` (component scores, explanation JSONB, skill_gaps JSONB) · `career_roadmaps`.

**Consent & enrichment**
`consent_settings` (GitHub / portfolio / public web / AI analysis; external sources default OFF) ·
`enrichment_runs` (provider, target, status, normalised professional signals only).

**Auth & roles**
`user_roles` with `app_role` enum (`hr`, `employee`) in a separate table, read through the
`SECURITY DEFINER` helper `public.has_role(uid, role)` — no role column on the profile, so
privilege escalation through profile edits is impossible.

**HR features**
`profile_analyses` (HR-only) · `recognitions` · `hr_reports` · `pipeline_candidates` ·
`mobility_messages` · `industry_trends_cache`.

**Storage** — private `avatars` bucket (5 MB limit, object path prefixed with `auth.uid()`,
HR read allowed, access via signed URLs, no public bucket).

**Relational integrity** — verified during the audit: 0 orphan employee_skills, 0 orphan
projects, 0 orphan role_matches; 30 demo employees, 12 roles, 48 skills, 56 projects,
216 skill records, no NULL/out-of-range proficiency or confidence values.

---

## 6. AI Pipeline

1. **Context assembly (server)** — employee profile, declared skills, projects with tech stacks,
   certifications, and only those enrichment signals the employee consented to.
2. **Constrained extraction** — a system prompt with hard rules: never invent evidence; only
   skills from the supplied catalogue; classify as direct / hidden / transferable; `source` must
   name the actual evidence origin; conservative confidence (one indirect signal < 50, one solid
   item 50–74, multiple strong items 75+); `confidence_basis` per skill; learning actions only
   from supplied gaps; professional wording; never claim GNN / SHAP / federated learning.
3. **Persistence** — skills written to `employee_skills`, then deterministic matches recomputed
   and written to `role_matches`.
4. **Structured report** — `buildSkillAnalysis` renders ten sections: declared skills,
   evidence-backed discovered skills, hidden skills, transferable skills, proficiency,
   confidence, evidence, recommended roles, skill gaps, recommended learning actions, with a
   "How to read confidence" explainer (High ≥ 75, Medium ≥ 50, Low below).
5. **Roadmap** — month-by-month plan generated from the actual gap list, with a deterministic
   fallback if the model is unavailable.
6. **Career assistant** — answers scoped strictly to the selected employee's own skills,
   projects, matches, gaps and roadmap.

### Scoring formula (deterministic, no randomness)

```text
match_score = 0.60 · semantic_score
            + 0.30 · skill_coverage_score
            + 0.10 · transferable_bonus          (normalised 0–1 → 0–100 %)

transferable credit = owned_proficiency · adjacency_confidence · TRANSFER_DISCOUNT (0.8)
```

Transferability is treated as adjacency, never equivalence — the UI always labels it
"Transferable Skill". The same functions power the Career Simulator, so before/after numbers are
directly comparable and reproducible.

---

## 7. Feature Inventory

| Area | Implemented |
|---|---|
| Routes | `/`, `/dashboard`, `/profile`, `/employee/:id`, `/roles`, `/role/:id`, `/skills`, `/career-simulator`, `/ai-assistant`, `/privacy`, `/settings`, `/hr-dashboard`, `/auth`, `/me`, `/my-profile`, `/hr` |
| Employee | Profile + picture upload, public link icons (GitHub, LinkedIn, Slack, portfolio), AI insights, hidden skill cards, radar current vs target, recommended roles, roadmap, simulator, assistant, recognitions, HR reports, industry trends, PDF report |
| HR | Talent directory with search, candidate workspace, honest link analysis, recognition badges, reports, mobility pipeline with message replies, HR-only analysis detail, HR PDF (adds match scores and evidence sources) |
| Org view | Talent overview, skill heatmap, hidden talent alerts, organisation skill gaps, mobility insights — all labelled DEMO / PROJECTED |
| Enrichment | Optional, consent-gated, public URLs only; "Apify Public Enrichment" source badge; Slack honestly reported as unavailable (no public profile surface) |
| Privacy | Consent toggles (external sources OFF by default), what-data-is-used explanation, demo-profile reset |
| Loading / errors | Skeletons, progress states, friendly errors with retry, external-failure fallback to demo data |
| Accessibility | Semantic controls, aria-labels on all toggles/switches, visible focus states, keyboard navigation, contrast-checked tokens |

---

## 8. Security Posture

**Implemented**
- No secret is reachable from the browser; all provider calls run in server functions.
- RLS on every table. Employees can write only their own profile, projects, skills and consent.
  HR-only tables (`profile_analyses`, `pipeline_candidates`, `mobility_messages`, `hr_reports`)
  are gated by `has_role(auth.uid(),'hr')`; employees can read only rows addressed to them.
- Roles live in a separate `user_roles` table behind a `SECURITY DEFINER` helper.
- Private avatar storage with per-user object prefixes and signed URLs.
- Employee email addresses are no longer readable by unauthenticated visitors and are no longer
  fetched by browser queries (column privilege revoked from `anon`).
- Leaked-password protection (HIBP) enabled; anonymous sign-ups disabled.
- Scraping restricted to public professional signals; no credentials, private messages, contacts,
  connection graphs, photos, locations or demographic attributes are collected or inferred.

**Accepted demo trade-offs (documented, intentional)**
- The demo tables (`employees`, `employee_skills`, `projects`, `role_matches`,
  `career_roadmaps`, `consent_settings`, `enrichment_runs`, plus reference tables `roles`,
  `skills`, `industry_trends_cache`) allow read access without signing in, so judges can explore
  the full experience without credentials. All rows are fictional. In a production deployment
  these read policies would be narrowed to authenticated users within the organisation.

---

## 9. Audit Results (this report's verification pass)

| Check | Result |
|---|---|
| TypeScript | `tsgo --noEmit` exit 0 |
| Build | build OK, no errors in the build log |
| Routes | all 16 routes render; role detail reachable from role cards |
| Database relations | no orphan rows across skills, projects, matches |
| Match calculations | deterministic; component scores reproduce on repeat runs |
| NaN scores | none found on any page (desktop and mobile sweep) |
| Charts | radar, before/after bar chart and heatmap render with valid domains |
| Mobile layout | no horizontal overflow at 390 px on home, dashboard, simulator |
| Console errors | none captured across all pages |
| API failures | none; external integrations fall back to demo data by design |
| Error handling | every data surface has loading, error and retry states |
| Secrets | no key referenced in client code |
| Sample data | leftover audit/test profiles removed; 30 demo employees restored |

**Fixed during the audit**
1. Employee email addresses were readable by unauthenticated visitors — removed from all browser
   queries and revoked at the column level for `anon`.
2. Leaked-password protection was disabled — now enabled.
3. Job-title writes now go through a dedicated `job_title` column with a database trigger that
   keeps the reserved-keyword column `current_role` in sync, removing a fragile write path.
4. Temporary test accounts created during verification were deleted from both the profile table
   and authentication.

---

## 10. Limitations (stated honestly)

- Demo environment: all employees, roles, projects and organisation metrics are fictional.
- Matching is a transparent weighted formula, not a trained graph neural network; explanations
  are evidence-based, not SHAP attributions; there is no federated learning.
- Readiness percentages are projections, not employment predictions or guarantees.
- Slack provides no publicly scrapable profile, so the Slack option reports that a connected
  workspace would be required rather than pretending to scrape.
- LinkedIn enrichment depends on a paid Apify actor; without it the flow falls back to demo data.
- Industry trends use a live search when the connector is available, otherwise a curated list.
- No HRIS integration, no activity monitoring, no vector database, no per-user OAuth.

---

## 11. Future Scope

- Graph-based matching with a real embedding store, evaluated against outcome data.
- HRIS / ATS integration for live role requisitions and org structure.
- Manager-side calibration loops so skill inferences can be confirmed or rejected.
- Bias auditing and fairness reporting over match distributions across departments.
- Learning-platform integration so roadmap steps map to actual courses and internal projects.
- Notification and scheduling layer for mobility conversations and readiness reviews.

---

## 12. Impact

Internal mobility fails mostly because hidden capability is invisible: an employee's job title
is a poor summary of what they can do. SynapseTalent.ai makes that capability visible with
evidence, gives the employee an actionable route to the role they want, and gives HR a defensible,
explainable shortlist for internal openings — reducing external hiring cost, shortening time to
fill, and improving retention by showing people a path that exists inside the company.

---

