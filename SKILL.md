---
name: apple-calendar
description: Create, search, update, and delete events in macOS Calendar.app and reminders in Reminders.app from natural-language requests (Korean/English). Triggers on phrases like "일정 등록해줘", "회의 잡아줘", "약속 추가", "미리알림 추가해줘", "할일 추가", "캘린더 확인해줘", "오늘 일정 뭐있어", "schedule a meeting", "add a reminder", "what's on my calendar today".
---

# Apple Calendar & Reminders Skill

A skill for controlling macOS **Calendar.app** (events) and **Reminders.app** (reminders/to-dos) from natural-language requests. It drives both apps via `osascript -l JavaScript` (JXA). Pure AppleScript syntax is avoided because its date literals depend on the system locale and are a frequent source of parsing bugs — JXA uses the standard JS `Date` object instead, which is safe.

## 0. Response language

Always respond to the user in the language they used in their request — mirror it, don't default to Korean or English. Plan summaries, confirmations, results, and error messages should all match the requester's language.

## 1. Calendar vs Reminders: which one to use

Classify each request into one of the two based on these signals:

| Signal | Target |
|---|---|
| A specific start/end time exists (a meeting, an appointment — "at 3pm", "2-3pm", "tomorrow morning's meeting") | **Calendar event** |
| Deadline/task-oriented, no specific time, or the core need is "remind me at that time" ("take out the trash", "submit the report", "grocery reminder") | **Reminders** |
| The word "reminder" (or "미리알림") is used explicitly | **Reminders** |
| Ambiguous | Default to Calendar event. If there's no duration and it's a single action/task, treat it as Reminders instead |

## 2. Data model (verified via macOS `sdef` — do not guess)

### Calendar.app `event` (per the Calendar app's scripting dictionary)
- `summary` (title), `start date`, `end date`, `allday event`
- `location`, `description` (=notes), `url`, `status`
- `uid` (read-only identifier — always target update/delete by this)
- the containing `calendar` — **this is the category.** There is no separate category field on the event itself.
- alarms (`display alarm`, etc.): `trigger interval` (integer minutes, **negative = before the event, positive = after**)

### Reminders.app `reminder`
- `name`, `body` (=notes)
- `due date` (date+time), `allday due date` (date only), `remind me date` (the actual time the notification fires — the key field for "reminders")
- `priority` (integer: 0=none, 1–4=high, 5=medium, 6–9=low)
- `flagged`, `completed`
- the containing `container` = `list` — **this is the category.**
- `id` (read-only identifier — always target update/delete by this)

Note: events have no `priority` field, and reminders have no dedicated category field (the list *is* the category). Neither class has a field literally named "category" — don't get confused by this.

## 3. Category (calendar/list) resolution logic

1. Use `scripts/list_calendars.js` or `scripts/list_reminder_lists.js` to fetch the calendars/lists that **actually exist on this Mac**. Never invent a calendar that doesn't exist.
2. Use the keyword hints in `mapping/category_map.json` to pick the most likely calendar/list.
3. If there's no mapping or it's ambiguous, pick the most plausible candidate, include it in the step-4 plan, and let the user correct it during confirmation. Never proceed silently on a guess alone.
4. If none of the existing calendars/lists fit and a **new one must be created**, give it an identifiable, consistent name — avoid vague names like "temp", "TEST", or a single letter; use a name that conveys its purpose, and follow the same naming pattern as any existing calendars/lists with a similar purpose. Creating a new calendar/list also goes through the step-4 confirmation flow (include the proposed name in the plan and get confirmation before creating it).

## 4. Execution flow

- **Create / update / delete**: always show a plan in the format below first and only run the script after the user confirms. Render the plan in the user's language (see [Section 0](#0-response-language)) — the example below is illustrative, not a fixed template:
  ```
  [Calendar] Register meeting
  Title: Weekly team sync
  Time: 2026-06-26 (Fri) 15:00–16:00
  Calendar: Work
  Location: (none)
  Alarm: 10 min before
  → Create this?
  ```
- **Read / search**: non-destructive, so run immediately and show the results without confirmation.
- **Update/delete** first search with `find_events.js` / `find_reminders.js` to pin down the target's `uid`/`id`, then call update/delete with that identifier. Never match on title alone — you could hit the wrong event with the same name.

## 5. Script interface (implemented)

All scripts live in `scripts/` as executable JXA files (`#!/usr/bin/osascript -l JavaScript` shebang, already `chmod +x`). They can be run directly: `./scripts/list_calendars.js`. They take `--key value` style arguments via argv and return JSON on stdout.

| Script | Arguments | Returns |
|---|---|---|
| `list_calendars.js` | (none) | `[{name, color}]` |
| `list_reminder_lists.js` | (none) | `[{name, color}]` |
| `find_events.js` | `--from`, `--to` (ISO8601), `--calendar` (optional), `--query` (optional, title keyword) | `[{uid, summary, start, end, calendar, location}]` |
| `find_reminders.js` | `--from`, `--to` (optional), `--list` (optional), `--query` (optional), `--include-completed` (optional) | `[{id, name, due, remindAt, list, completed, priority}]` |
| `create_event.js` | `--title --start --end --calendar [--location] [--notes] [--alarm-minutes-before] [--allday]` | `{uid}` |
| `create_reminder.js` | `--name --list [--due] [--remind-at] [--notes] [--priority]` | `{id}` |
| `update_event.js` | `--uid --calendar [field options]` | `{ok}` |
| `update_reminder.js` | `--id [field options]` | `{ok}` |
| `delete_event.js` | `--uid --calendar` | `{ok}` |
| `delete_reminder.js` | `--id` | `{ok}` |
| `move_event.js` | `--uid --from-calendar --to-calendar` | `{uid}` (a *new* uid — see note below) |

`move_event.js` note: Calendar.app's standard `move` command isn't actually implemented for the event class and always errors (confirmed: -10014 / -1700). So it works around this by recreating the event with the same properties in the destination calendar and deleting the original — **the uid changes.**

Date arguments use ISO8601 format (e.g. `2026-06-26T15:00:00+09:00`).

## 6. One-time setup

The first time a script runs, macOS will prompt for Calendar/Reminders access for Terminal/Claude Code. This must be allowed for anything to work (System Settings > Privacy & Security > Calendars / Reminders).

## 7. `mapping/category_map.json`

A keyword → calendar/list name hint table. Users can edit it directly. See `mapping/category_map.json` for the format.

## 8. Known limitation: can't assign/move a calendar to a specific account (e.g. iCloud)

Calendar.app's AppleScript/JXA dictionary has **no account class/property** (unlike Reminders.app). So any new calendar created via `create_event.js` or ad-hoc calendar-creation code always lands in the default location (usually local "On My Mac"), and there's no way to script "put this calendar under the iCloud account." GUI menu automation (System Events) could work around this, but it needs the Accessibility permission on top of everything else and is fragile across menu text/macOS versions — not recommended.

**If the user asks something like "move this calendar to iCloud"**, guide them through this instead:
1. Have the user create a new calendar with the same name directly in Calendar.app's sidebar, under the desired account section (e.g. iCloud) — via the "+" button.
2. Then use `move_event.js` to move the existing calendar's events into the new one (it only needs the name to match — the account doesn't matter to the script).
3. Clean up the now-empty original (local) calendar with a delete command if needed (there's currently only `delete_event.js`, not a script that deletes a calendar itself — add one using the same pattern if needed).
