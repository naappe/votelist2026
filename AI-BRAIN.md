# AI Brain - Villimale Votelist 2026

Last updated: 2026-07-07
Repo: naappe/votelist2026
Primary local checkout: /workspace/votelist2026-clean2

This file is the project memory. Read it before changing the site. Update it after any meaningful change to data logic, page structure, Supabase tables, UI decisions, or deployment rules.

## Project Purpose

Villimale Campaign Manager is a mobile-first voter management website for campaign work.

The site must help the team:

- Search voters quickly.
- Open a voter card.
- View photo, name, ID, house, address, phone, party, box, age, and sex.
- Save call status, reach status, vote status, transport need, door-to-door follow-up, assignment, and remarks.
- Filter by campaign work sections such as Need Call, Reached, Will Vote, Pending, No Phone, Transport, and Follow-up.
- Use a voting-day Zero Day page for will-vote and guaranteed voters.
- Share simple read-only voter views when needed.

## AI Brain Role

This repo uses `AI-BRAIN.md` as the safe project brain.

The brain is not a hidden server and not a replacement for Git history. It is a living memory file that ChatGPT/Codex should read before changing the project.

The brain should remember:

- What the app is for.
- Which files matter.
- Which Supabase table and fields are active.
- Which UI decisions the user already approved.
- Which logic must not be broken.
- Which changes are still open questions.

After every meaningful change, update this file with:

- What changed.
- Why it changed.
- Which files were touched.
- Any new data fields, filters, or page behavior.

## Future Living AI Concept

An attached concept file described a larger "living AI brain" with:

- A web search engine.
- A file modification engine.
- Persistent vector memory.
- HTTP and WebSocket endpoints.
- ChatGPT integration.
- Backups and activity logs.

That design is useful as a future idea, but it should not be copied directly into this static GitHub Pages voter site.

Reasons:

- The current site is frontend-only HTML/CSS/JavaScript.
- A server brain would require protected API keys.
- File modification endpoints must never be public without strong authentication.
- GitHub Pages cannot safely run a Node/Express backend.
- Supabase service-role access must not be exposed in browser code.

Safe version for this repo:

- Keep `AI-BRAIN.md` as the project memory.
- Let ChatGPT/Codex read and update this file during repo work.
- Use Git commits as the real audit trail.
- Use Supabase only through safe browser publishable keys and RLS.
- If a backend AI agent is added later, place it in a separate private server or private repo with authentication, logs, backups, and strict file allowlists.

## Current Repo Structure

Main files currently used:

- `index.html` - entry/home page.
- `login.html` - Supabase auth login page.
- `dashboard.html` - main campaign dashboard.
- `zero-day.html` - election-day voter tracking page.
- `all-voters.html` - all voters page if still linked.
- `shared.html` - shared/read-only view file in the cleanup checkout.
- `config.js` - Supabase URL, publishable key, table name, login users, and section config.
- `app.js` - main login, dashboard, Supabase loading, filtering, modal, and save logic.
- `zero-day.js` - Zero Day page logic.
- `style.css` - main site styles.
- `dashboard-cleanup.css` - dashboard cleanup styles.
- `dashboard-cleanup.js` - dashboard cleanup behavior.

## Quick Project Snapshot

- Repository: `naappe/votelist2026`
- Purpose: Voter management for Villimale campaign.
- Stack: HTML/CSS/JavaScript + Supabase + GitHub Pages.
- Primary workspace page: `dashboard.html`
- Zero Day workspace: `zero-day.html`
- Core dashboard logic: `app.js`
- Zero Day logic: `zero-day.js`
- Configuration: `config.js`
- Live brain panel: `ai-brain-live.js`
- Cleanup and share tools: `dashboard-cleanup.js`

Current features:

- Voter management.
- Assignment tracking fields.
- Phone tap-to-call behavior where phone links/buttons are used.
- House filtering.
- Box filtering.
- Shared/read-only view.
- Results tracking through vote, reach, phone, transport, D2D, support, and remarks fields.
- AI Brain Live Smart Insights panel.

Future AI goals:

- Answer voter queries from loaded campaign data.
- Suggest follow-ups from deterministic rules.
- Detect simple campaign patterns.
- Generate reports from Supabase data through a safe backend or export workflow.

Learning log:

- 2026-07-06: Added/fixed phone call behavior in voter cards and popup flow.
- 2026-07-06: Fixed vote saving logic and status movement.
- 2026-07-06: Added assignment-related fields and rules.
- 2026-07-07: Created `AI-BRAIN.md` project memory.
- 2026-07-07: Added safe live AI Brain frontend panel using local row analysis.

User preferences:

- Admin email reference: `naappe@gmail.com`.
- Phone calls are preferred over SMS.
- House grouping is preferred.
- Follow-ups are best planned for evening calling windows such as 7-9 PM.

## Supabase

Current public client config in `config.js`:

- Supabase project URL: `https://espezmdpkoixnfchomqb.supabase.co`
- Current table in code: `full_import`
- Publishable key is used in browser code.

Important:

- Never place a Supabase service role key in frontend files.
- If the table changes to `campaign`, update `config.js`, all queries, and this file together.
- Before changing table names, confirm whether the data has already been copied from `full_import` into the new table.

## Expected Data Fields

The app currently expects these voter fields:

- `id`
- `image_number`
- `photo_url`
- `name`
- `national_id`
- `house`
- `lives_in`
- `phone`
- `party`
- `election_box`
- `phone_status`
- `reach_status`
- `vote_status`
- `transport_status`
- `d2d_status`
- `remarks`
- `support_level`
- `vote_assigned_by`
- `vote_assigned_at`

Useful status values:

- `phone_status`: `need-call`, `called`, `wrong-number`, `out-of-range`, `no-phone`
- `reach_status`: `reached`, `not-reached`
- `vote_status`: `pending`, `will-vote`, `not-vote`
- `transport_status`: `need-transport`, `arranged`, `picked-up`
- `d2d_status`: `follow-up`

Default logic:

- A voter starts as pending/not reached unless saved otherwise.
- `will-vote` means committed supporter.
- `not-vote` must not still count as will-vote.
- `pending` must stay separate from will-vote and not-vote.
- Assignment should be blank by default. Do not auto-fill `naappe@gmail.com` as the assignee.
- Remarks must be saved and displayed clearly.

## Current Dashboard Sections

Configured in `config.js`:

- Need Call
- Reached
- Will Vote
- Pending
- No Phone
- Need Transport
- Follow-up

Dashboard stats should be practical and clickable only when they are meant to filter the voter list. Avoid duplicate buttons and duplicate filters.

## Advanced Dashboard Analytics Roadmap

The advanced dashboard vision is a command center for voter operations, but it must stay realistic and fast.

Current implemented or partly implemented features:

- Live KPI/filter cards for campaign sections.
- Search by voter details, house, and box.
- Target-to-win panel.
- Top 10 houses panel.
- Follow-up queue through `d2d_status = follow-up`.
- Zero Day page for voting-day work.
- Offline save queue and local row cache.
- Shared/read-only view work in `shared.html` and cleanup code.
- Older CSV export exists in `all-voters.html`, but it is not the main dashboard flow.

Not currently implemented as full features:

- Event creation and RSVP tracking.
- Automated email, SMS, Slack, or Discord notifications.
- PDF report generation.
- Scheduled daily or weekly reports.
- Server load alerts.
- Real AI model analysis.
- Device, city, country, and IP tracking.
- Two-factor authentication.
- Full audit/activity log.

Do not claim these roadmap features are already live unless code and database support have been added.

Fast frontend analytics that are safe to add:

- Total voters.
- Reached voters.
- Need call.
- Pending.
- Will vote.
- Not vote.
- No phone.
- Need transport.
- Follow-up.
- Guaranteed supporters.
- Top houses.
- Top boxes.
- Assignment counts when assignment data exists.
- Simple percentages and progress bars calculated from loaded rows.
- Recent local activity from fields such as `updated_at`, `vote_assigned_at`, or status changes if the table supports them.

Avoid adding heavy analytics in the browser:

- No AI model calls.
- No long-running prediction engine.
- No browser crawling.
- No large chart libraries unless truly needed.
- No repeated full-table fetch for each card or chart.

Preferred analytics approach:

- Load voter rows once.
- Reuse `window.__villimaleRows`.
- Calculate cards, lists, and simple charts locally.
- Keep charts CSS-based or lightweight SVG/canvas if needed.
- If advanced history is required, add a separate Supabase table such as `voter_activity_log` and fetch only recent rows.
- If events are required, add a separate table such as `campaign_events`.
- If scheduled alerts/reports are required, use a backend or Supabase Edge Function, not GitHub Pages frontend code.

AI insight wording rule:

- `AI-BRAIN.md` can store rules and project memory.
- It does not generate live AI insights by itself.
- Any "AI insight" shown in the dashboard must either be a deterministic local rule based on voter data or come from a secure backend AI service.
- Label deterministic insights as "Smart Insights" unless a real AI service is connected.
- `ai-brain-live.js` is the current live frontend brain. It shows status, heartbeat, row counts, and deterministic Smart Insights from already-loaded voter rows.
- `app.js` and `zero-day.js` dispatch `villimale:rows-updated` after loading or changing rows. The live brain listens to that event.
- The heartbeat is a lightweight UI pulse only. It must not poll Supabase or call AI services.

Possible simple Smart Insights:

- "Need Call is high" when `phone_status = need-call` is a large percentage.
- "Follow-up queue is growing" when `d2d_status = follow-up` is high.
- "Transport needs attention" when many voters have `transport_status = need-transport`.
- "House focus" based on top houses with many pending or follow-up voters.
- "Zero Day priority" based on will-vote and guaranteed supporters.

## UI Rules

User preference:

- Keep the site simple, fast, and mobile friendly.
- Use a professional card design.
- Voter photos must fit neatly in a square or fixed image area.
- Important voter information comes first: name, address/house, phone, ID.
- Keep action controls inside the voter popup/card.
- Phone number click should open phone call on mobile.
- Do not make photos too large.
- Do not add confusing repeated functions.
- Remove or hide dashboard parts that do not help campaign work.
- Keep shared links simple and read-only when they are for assigned people.

## Performance Rules

The frontend must stay fast. Do not add heavy AI processing to the browser.

Current safe performance model:

- Static GitHub Pages frontend.
- Supabase browser client only.
- No OpenAI, Anthropic, Puppeteer, Express, Chroma, WebSocket server, or AI SDK code in frontend files.
- `AI-BRAIN.md` is plain project memory, not runtime logic.
- Campaign calculations should use already-loaded voter rows when possible.
- Avoid duplicate full-table Supabase reads on the same page.
- `app.js` and `zero-day.js` expose loaded rows as `window.__villimaleRows`.
- `dashboard-cleanup.js` should reuse `window.__villimaleRows` or `window.__cleanupRows` before fetching from Supabase.
- Keep expensive work event-driven, not running every second.
- Cache rows in localStorage for offline mode.

Performance checklist before finishing changes:

- Page loads only needed scripts.
- No AI model calls from the browser.
- No service-role keys in frontend.
- No repeated full-table fetch when existing page data can be reused.
- Search/filter runs on local loaded rows.
- Images stay constrained with fixed dimensions or object-fit.
- Mobile layout does not re-render more than needed.

## Authentication Rules

Current app uses Supabase auth through `login.html`.

Known login users in `config.js`:

- `admin`
- `pnc2026`

Do not expose real passwords in repo files or in this AI Brain.

If auth is removed or changed, update:

- `login.html`
- `app.js`
- any page redirect logic
- this file

## Assignment Rules

Assignment is important.

The app should support:

- A clear assign button or assign input in the voter popup.
- Manual assignee name entry.
- Filtering by assignee after voters are assigned.
- Blank default assignee.
- Clear visibility of who assigned or who is assigned to the voter.

Avoid:

- Auto-assigning all voters to the logged-in email.
- Showing assignment filters if assignment data is empty or confusing.

## Zero Day Rules

Zero Day is for election-day work.

It should focus on:

- Will-vote voters.
- Guaranteed supporters if `support_level` exists.
- Marking voted / not voted.
- Transport needs.
- Phone result.
- Remarks.

Zero Day must not disturb normal dashboard filters.

## Git And Safety Rules

There are two local checkouts:

- `/workspace/votelist2026-live`
- `/workspace/votelist2026-clean2`

Use `/workspace/votelist2026-clean2` unless the user explicitly asks for the live checkout.

Before edits:

- Run `git status --short`.
- Do not reset or revert user changes unless the user clearly asks.
- Do not overwrite uncommitted work.

Before pushing:

- Check changed files.
- Confirm which checkout is being pushed.
- Keep commits small and named clearly.

## Open Questions

Confirm these before large changes:

- Should the production table remain `full_import`, or should the app move to `campaign`?
- Which checkout should be treated as final: `votelist2026-live` or `votelist2026-clean2`?
- Should login remain Supabase auth, or should the shared campaign link be open without login?
- Which page should be the main public GitHub Pages entry?
