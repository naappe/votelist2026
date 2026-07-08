# Backup and Restore Guide

## Current stable backup

This repository has a dedicated stable backup branch:

```text
backup/stable-20260708-voters-fixed
```

Stable commit:

```text
91bf95d3fec0fd4282036acfafae078e65680442
```

This backup was created after the following fixes were confirmed in code:

- Voters page information status result cards can navigate to matching results.
- AI Dashboard result cards can navigate to voter result lists.
- Safe shared list supports photos when `photo` exists in the share payload.
- Self-assign page asks for assigner name only.
- Self-assign page shows assigned names under each voter.
- Multiple people can assign the same voter; names are preserved and displayed.
- Public share and assignment pages avoid exposing campaign-only fields.

## Restore instruction for AI or developer

If the website is damaged by a mistaken change, restore from:

```text
backup/stable-20260708-voters-fixed
```

or restore main to commit:

```text
91bf95d3fec0fd4282036acfafae078e65680442
```

Recommended safe restore flow:

1. Compare current `main` with `backup/stable-20260708-voters-fixed`.
2. Identify files changed after the stable backup.
3. Restore only the broken files when possible.
4. If many files are broken, reset `main` to the stable commit.
5. After restore, wait for GitHub Pages to deploy.

## Important data note

The website code is backed up in GitHub. Voter records and assignment records live in Supabase. Do not delete or overwrite Supabase data unless explicitly instructed.

Main Supabase table:

```text
public.full_import
```

Assignment share table:

```text
assignment_shares
```

Assignment RPC functions used by the public self-assign page:

```text
claim_assignment
unclaim_assignment
```

## Current active files

### Main pages

```text
index.html
login.html
voters.html
ai-dashboard.html
dashboard.html
shared.html
safe-share.html
```

### Core JavaScript

```text
js/app.js
js/config.js
js/voter-url-router.js
js/voter-info-status.js
js/voter-info-nav-fix.js
js/dashboard-result-nav-fix.js
js/assign-share.js
js/assign-results.js
js/assigned-person-filter.js
js/modal-assignment-panel.js
js/modal-phone-call.js
js/vote-save-override.js
js/ai-brain-live.js
js/ai-dashboard-nav.js
js/ai-chat.js
```

### Current public share behavior

`safe-share.html` is read-only. It shows:

```text
photo, name, ID, address, phone
```

`shared.html` is for self-assign. It shows voter details and assignment names. It asks the assigner for name only.

## AI quick project understanding

This is a static GitHub Pages app. There is no backend server inside the repo. Supabase is the backend. Do not create Node, Python, or server-only code unless explicitly requested.

Core flow:

```text
voters.html -> loads js/app.js -> reads public.full_import -> renders cards
assign-share.js -> creates assignment_shares token -> opens shared.html or safe-share.html
shared.html -> uses token -> calls claim_assignment/unclaim_assignment
assign-results.js -> admin result view for who assigned voters
voter-info-status.js -> information status card
voter-info-nav-fix.js -> makes Voters page status cards clickable
```

## Before changing code

1. Read this file.
2. Read `README.md`.
3. Check whether an existing file already owns the function.
4. Do not add duplicate functions for the same behavior unless the existing function is broken and documented.
5. Prefer small hotfix files only when fixing live urgent bugs.

## After changing code

Update this file and `README.md` if:

- a new page is added,
- a new JavaScript file is loaded,
- public share behavior changes,
- assignment logic changes,
- restore point changes,
- Supabase table/RPC assumptions change.
