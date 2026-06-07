# Farida Feedback Review & Reconciliation — 6 Jun

Source document: `Amended Thoughts for Rob- 06 Jun.docx` (founder feedback, written against **staging.butlersinc.com**).
Author of this spec: review session 2026-06-07. Branch: **staging only** (see Constraints).

---

## 1. Critical finding (read first)

Butler detail pages serve four fields — `hero.headline`, `hero.subheading`, `trustIndicators`, `commonRequests` — from the Supabase **`site_content`** table whenever a row exists, NOT from the static `butler-page-configs.ts`. `mergeContent()` (`src/lib/content.ts`) fully overrides those fields; the static file is only the fallback. **All 6 butlers have rows.**

A read-only query of the live DB on 2026-06-07 confirmed the rows are **stale** — seeded by `scripts/seed-content.ts` before the static content-safety pass (`e54c0c0`) and the em-dash cleanup (`0d96fb3`). So the live site still shows:

- Removed risky examples (Michelin, sold-out West End, high-net-worth, medical appointment, private viewing).
- `Insured for items up to £5,000` (the static file already says £50,000).
- **Em dashes in every `commonRequest`** — violating the project's #1 copy rule, undetected because the cleanup only touched static files and `butler-content.test.ts` only guards the static fallback.

**Consequence for this work:** roughly a third of Farida's "remove" requests are already satisfied in the static files but NOT on the live site. Editing static files alone is a silent no-op for those four fields. This is why her feedback referenced content the `staging` branch "already removed."

Captured durably in: `docs/bug-resolution-log.md` (2026-06-07), `CLAUDE.md` (Content-system pattern + Gotchas), and Claude memory `project_site_content_overrides_static`.

## 2. Where butler copy lives (content topology)

| Field | Source on live site | Overridable by DB? | File |
| --- | --- | --- | --- |
| Booking task labels | Static code | No | `src/data/butler-tasks.ts` |
| `hero.headline` / `hero.subheading` | **Supabase `site_content`** (fallback: static) | **Yes** | DB + `butler-page-configs.ts` |
| `trustIndicators` | **Supabase `site_content`** (fallback: static) | **Yes** | DB + `butler-page-configs.ts` |
| `commonRequests` | **Supabase `site_content`** (fallback: static) | **Yes** | DB + `butler-page-configs.ts` |
| `hero.useCases` (category-card bullets) | Static code | No | `butler-page-configs.ts` |
| Category-card subtitle | Static code | No | `src/data/services.ts` |
| Category-card examples | Static code | No | `src/data/services.ts` |
| Genie example wishes | Static code | No | `GenieSection.tsx`, `GenieDrawer.tsx` |

## 3. Decisions locked (from founder/Rob this session)

1. **Source version Farida reviewed:** staging (explained by stale DB overrides).
2. **Deliverables:** this master review doc + 3 separate design docs for the structural changes.
3. **This session:** plan + implement the content edits (Sections 5–8). Structural changes (Section 9) are design-only.
4. **Drift safeguard:** **static = single source of truth**; DB rows are derived (pushed via migration). Add a drift-detection test that fails if `site_content` diverges from static OR contains forbidden content (em dashes, removed examples). Admin editor stays but drift is flagged.
5. **DB delivery:** a **versioned migration** (`supabase/migrations/00X_*.sql`) that rewrites the 6 rows from the corrected static content. Matches existing pattern `003`.

## 4. Delivery mechanisms

- **M1 — static task labels** (`butler-tasks.ts`): reflect live immediately on deploy. Most relabel/add/remove requests.
- **M2 — DB content** (`site_content` migration): the only way hero/trust/commonRequests reach the reader. Generated from corrected static config.
- **M3 — static fallback sync** (`butler-page-configs.ts`): bring to final desired state first; the migration is derived from it; keeps the test green.
- **M4 — component code** (`GenieSection.tsx` / `GenieDrawer.tsx` + tests): Genie example wish; bespoke consultation line.

Approach: **edit static (M1 + M3) to the final state → generate migration (M2) from M3 → update component code (M4) → add drift test.** Because static is already clean, "remove" items that are gone from static become automatic no-ops once the migration pushes the clean list; only genuinely new edits (adds/relabels/the few DB-only fixes) need authoring.

## 5. Editing items — per butler (the document, reconciled)

Legend: ✅ = unambiguous · ⚠️ = interpretation applied, confirm with Farida.

### Busy Butler
| # | Request | Mechanism | Target | Note |
|---|---|---|---|---|
| B1 | Insurance to £50,000 | M2 (+M3 already £50k) | trustIndicator `Insured for items up to £50,000` | DB currently `£5,000`. This is the live fix. ✅ |
| B2 | Change "household errands etc" | M1 | task `errands` label to `Business and office errands including photocopying, binding, lamination etc` | ✅ |
| B3 | Remove "procurement services"; add two | M1 | remove task `procurement`; add `Corporate events` + `Meeting secretaries and assistants` | new ids `corporate-events`, `meeting-secretaries` ✅ |
| B4 | Remove commonRequest "important documents from solicitor to client" | M2 | drop from list | already absent from static; migration drops it live ✅ |
| B5 | Remove commonRequest #07 urgent shopping | M2 | drop from list | already absent from static; migration drops it live ✅ |

### Baby Butler
| # | Request | Mechanism | Target | Note |
|---|---|---|---|---|
| BB1 | "school play and recital recording" | M1 | task `recital-recording` to `School plays, sports games, recitals etc attendance for filming` | ✅ |
| BB2 | Add 4 options | M1 | add tasks: `Elderly assistance to appointments and check-ups`; `Personalised gift packs created and delivered for kids' birthdays`; `Kids clothing and essentials shopping and errands`; `Teenager check-ins` | append before `Other` ✅ |
| BB3 | "kids' activity runs" | M1 | task `activity-planning` (`Kids activity planning`) to `Kids parties, activities and playdates attendance` | ⚠️ doc says "activity runs"; nearest existing label is "Kids activity planning" |
| BB4 | Remove commonRequest "accompany child to medical appointments" | M2 | drop from list | already absent from static; migration drops it live ✅ |
| BB5 | "real-time photo updates" to butler-background line | M2 + M3 | trustIndicator `Real-time photo updates sent to you` to `Butler background provided ahead of request` | ⚠️ doc text garbled ("butler background of provided ahead of request"); confirm exact wording |

### Bougie Butler
| # | Request | Mechanism | Target | Note |
|---|---|---|---|---|
| BG1 | New top tagline + "fabulous" gold & bold | M2 (text) + M4 (styling) | hero.subheading to `For those luxuries that make life fabulous` with "fabulous" rendered gold + bold | ⚠️ "make like" read as "make life". ⚠️ Confirm tagline = hero subheading (vs `services.subtitle`). Gold/bold needs a small render change (plain-string DB can't carry styling) — see Open Questions. |
| BG2 | "personalised gift packages" | M1 | task `gift-packages` to `Personalised gift experiences` | ✅ |
| BG3 | Personal shopper relabel | M1 | task `personal-shopper-returns` to `Personal shopper errands, including multiple items store pick-ups and returns` | ✅ |
| BG4 | Night club relabel | M1 | task `nightclub-booking` to `Night club bookings and table service experiences with attendants` | ✅ |
| BG5 | Add 3 options | M1 | add tasks: `High end and specialist grocery stores shopping and delivery`; `Wait staff for dinner parties`; `Travel concierge including packing and unpacking of luggage plus delivery of luggage` | ✅ |
| BG6 | Add 2 commonRequests | M2 | add `Coordinate groceries from multiple shops and deliver`; `House prep with flowers, candles and diffusers ahead of guests' arrival` | ⚠️ "House prep" grouped under "common requests" by position; confirm it's a common request not a task |
| BG7 | Remove Michelin (02), West End (03), Private viewing (05) | M2 | drop from list | already absent from static; migration drops live ✅ |
| BG8 | Remove "high net worth" from 04 | M2 | keep `Custom gift curation for personal and corporate occasions` | static already de-worded; migration pushes clean version ✅ |

### Base Butler
| # | Request | Mechanism | Target | Note |
|---|---|---|---|---|
| BS1 | Pick-ups relabel | M1 | task `pickups` to `Errands to pick-up and drop-off forgotten items` | ✅ |
| BS2 | Add "welcome home services" | M1 | add task `Welcome home services: house set up, fridge stocking, cleaners and gardeners coordination` | ⚠️ original used a semicolon list; normalised punctuation, confirm |
| BS3 | "house waiting" relabel | M1 | task `house-waiting` to `House waiting and monitoring of external service providers e.g. installations, fumigations, renovations` | ✅ |

### Bespoke Butler
| # | Request | Mechanism | Target | Note |
|---|---|---|---|---|
| BK1 | New tagline | M2 + M3 | hero.subheading to `For those out of the box requests that require a personalised touch` | ⚠️ removed the dash per em-dash rule; current value also has an em dash to fix |
| BK2 | Remove commonRequests 01, 03, 05; add 2 | M2 | keep 02/04/06; add `Gifts, organisation and presentation for Valentine's Day, birthdays, engagements, anniversaries, celebrations, and all other special events` and `Multi-trip planning and booking, including flights, hotels, transport, itineraries and other services` | ⚠️ confirm ordering of the 2 new items |
| BK3 | "set up a free consultation and let's see if we can fulfil your request!" | M4 (code) | new copy line/CTA on the bespoke page | ⚠️ placement TBD; bespoke shares the `[id]` page so needs conditional render. Confirm wording/placement. |

### Budget Butler
| # | Request | Mechanism | Target | Note |
|---|---|---|---|---|
| BD1 | Add "and mail redirection" | M1 | task `mail-packages` to `Mail sorting, package collection and mail redirection` | ✅ |
| BD2 | "tighten the language for budget butler" | — | **DEFERRED by Farida** ("which will work on") | not actionable this session |

## 6. Genie example wish (listed under "Busy Butler" in the doc, but it is the Genie examples)

Change `Source a sold-out designer handbag before the weekend` to `Arrange emergency childcare for tonight` in:
- `src/components/landing/GenieSection.tsx` (`EXAMPLE_WISHES[0]`)
- `src/components/genie/GenieDrawer.tsx`
- Update tests asserting `/sold-out designer/i`: `GenieSection.test.tsx`, `GenieDrawer.test.tsx`.
- Email test fixtures using the string as `notes` are arbitrary booking data and out of scope (leave unless you want consistency).

## 7. Em-dash sweep of the DB (compliance, in scope)

Because the migration rewrites all 6 rows from the (em-dash-free) static config, the live commonRequests/trust/hero em dashes are removed as a side effect. The drift test (Section 8) asserts no em dash (` — `) or en-dash-parenthetical survives in seeded content, locking this in.

## 8. Drift safeguard (static = source of truth)

1. `butler-page-configs.ts` is authoritative for the four overridable fields.
2. The migration sets each `site_content.content` = the corrected static config (a versioned, repeatable re-seed).
3. New test (e.g. `src/data/__tests__/site-content-drift.test.ts`) that:
   - Builds the expected content blob from static config (same shape `seed-content.ts` produces).
   - Asserts no forbidden strings (em dash `—`, `medical appointment`, `Michelin`, `West End`, `high-net-worth`, `Private viewing`, `£5,000`).
   - Optionally (separate `content:check` script, run manually with creds) fetches live `site_content` and diffs against static, reporting drift. CI test stays creds-free by validating the static-derived blob; the script validates the live DB.
4. Document in the migration header and `seed-content.ts` that static is the source of truth and the admin editor introduces drift that must be reconciled.

## 9. Out of scope here — structural changes (separate design docs)

These are the "Formatting" section and are bigger / feature-shaped. Each has its own design doc:

1. **PAYG vs Membership two-path entry** — `2026-06-07-payg-membership-entry-design.md`
2. **"Our Butlers" page restructure + new info step** — `2026-06-07-our-butlers-restructure-design.md`
3. **Genie redesign (red/white/gold, audacious, mobile-red bug)** — `2026-06-07-genie-redesign-design.md`
4. **Homepage hero darkness** — likely already addressed (commits `e7fc45e`, `7d9be13`). Verify against Farida's note; no new work expected.

## 10. Open questions for Farida

1. BG1: is the "top tag line" the bougie page hero subheading, or the category-card subtitle? And confirm "make life fabulous".
2. BG1: confirm "fabulous" styled gold + bold (needs a small render change, not just text).
3. BB5: exact wording — "Butler background provided ahead of request"?
4. BG6: is "House prep with flowers, candles and diffusers…" a common request or a booking task?
5. BK2: ordering of the two new bespoke common requests.
6. BK3: exact wording and placement of the bespoke free-consultation line.
7. BD2: budget-butler language tightening — awaiting Farida's copy.

## 11. Test plan (TDD)

- `butler-tasks` edits: extend/keep `butler-content.test.ts` assertions for new/changed labels (procurement gone, corporate-events present, gift experiences, etc.).
- `site-content-drift.test.ts`: forbidden-content + static-shape assertions (Section 8).
- Genie: update the two example-wish tests; assert new string present, old absent.
- Run `npm run test:run` green before any deploy.

## 12. Constraints

- **All changes on `staging`. Nothing is pushed or promoted to `main`.** Production promotion is a separate, explicitly-requested step (project hard constraint; founder reaffirmed 2026-06-07).
- The migration runs against the **staging** Supabase first. Production gets it only on a later, explicit promotion.
- No em dashes in any customer-facing string (the entire reason the DB sweep exists).
