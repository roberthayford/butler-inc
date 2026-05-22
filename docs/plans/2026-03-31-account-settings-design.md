# Account Settings — Design Document

**Date:** 31 March 2026
**Status:** Approved

---

## Overview

New page at `/members/settings` where users can update their profile (name, phone), email, and password.

## Sections

1. **Profile** — name and phone fields, saves to Supabase user metadata
2. **Email** — new email field, triggers Supabase confirmation email
3. **Password** — new password + confirm, minimum 6 chars

## Navigation

- Settings link added to dashboard header (next to user name)
- Back link to dashboard from settings page

## Not included (YAGNI)

- No avatar, no account deletion, no 2FA, no notification preferences
