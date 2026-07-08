# Database Status

Updated: 2026-07-08

## Active Supabase tables

- public.campaign
- public.assignment_shares
- public.user_roles
- public.profiles
- public.campaign_backup_final_20260708

## Active table

The website must use:

- public.campaign

The frontend setting is in js/config.js:

- table: 'campaign'

## Final verified counts

Active public.campaign:

- Total voters: 3264
- Will vote: 89
- Committed total: 89
- Reached: 90
- Assigned: 101

Final backup public.campaign_backup_final_20260708:

- Total voters: 3264
- Will vote: 89
- Committed total: 89
- Reached: 90
- Assigned: 101

## Security status

RLS is enabled on all public tables.

public.campaign:

- Public anonymous full-table read was removed.
- Authenticated role-based select remains.
- Authenticated role-based update remains.

public.assignment_shares:

- Public token links still work.
- Current design allows anyone with a valid shared link to open selected shared voters only.
- Future improvement: replace direct assignment_shares public read with a get_assignment_share RPC before removing public read.

## Backup rule

Keep only one final public backup:

- public.campaign_backup_final_20260708

Old duplicate voter tables are archived outside public schema.

## Known frontend issue

The top Information Status widget can show 0 even when the voter list loads. The voter list itself is correct. This is a frontend timing/cache bug in js/voter-info-status.js and does not mean Supabase data is missing.

## Do not change

Do not point the website back to full_import or villimale tables.
Do not remove assignment_shares public read until shared.html and safe-share.html are changed to use a secure RPC.
