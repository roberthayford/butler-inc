# Admin Membership Panel — Design Document

**Date:** 31 March 2026
**Status:** Approved

---

## Overview

Add a "Members" tab to the existing `/admin` page so admins can view all users, assign membership tiers, adjust hours/tasks, and activate/pause memberships.

## Architecture

- Tabbed layout on `/admin`: "Content" (existing) + "Members" (new)
- API routes for admin member management with email-based auth check
- Reuses existing admin auth pattern (server-side user check + admin email list)

## Members Tab

### User List View
- Table of all registered users from `auth.users`
- Columns: Name, Email, Tier (badge or "None"), Status, Actions
- "Edit" button per row

### Edit Membership (inline expandable)
- Tier selector: Lite / Essential / Heavy
- Number inputs: Hours total, Hours used, Tasks total, Tasks used
- Date inputs: Billing period start/end
- Status: Active / Paused / Cancelled
- Save button
- For users without membership: "Create Membership" button

## API Routes

- `GET /api/admin/members` — all users + joined membership data
- `PATCH /api/admin/members/[id]` — create or update a membership for user ID

Both routes verify the requesting user's email is in the admin list.

## Not included (YAGNI)
- No membership deletion (pause/cancel instead)
- No Stripe subscription integration
- No bulk operations
- No audit log
