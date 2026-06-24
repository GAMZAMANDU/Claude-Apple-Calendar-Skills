# Apple Calendar & Reminders Skill

A Claude Code skill that controls macOS **Calendar.app** (events) and **Reminders.app** (reminders) from natural-language requests, in Korean or English. Ask it to "schedule a meeting" or "회의 일정 등록해줘" and it creates, searches, updates, deletes, or moves real entries in your calendars/lists.

For the detailed behavior rules (category resolution, the confirm-before-execute flow, the underlying data model), see [`SKILL.md`](./SKILL.md). This file is the human-facing install/usage guide.

## Install

This repo is a Claude Code [plugin](https://code.claude.com/docs/en/plugins) (it ships `.claude-plugin/plugin.json` + `marketplace.json`). Two ways to install:

### Option 1: Via the plugin marketplace (recommended for sharing)

Inside Claude Code:

```
/plugin marketplace add GAMZAMANDU/Claude-Apple-Calendar-Skills
/plugin install apple-calendar@apple-calendar-skills
```

### Option 2: Directly on your own Mac (no marketplace registration needed)

```bash
git clone https://github.com/GAMZAMANDU/Claude-Apple-Calendar-Skills.git ~/Apple-Calender_Skills
ln -s ~/Apple-Calender_Skills ~/.claude/skills/apple-calendar
```

When a directory under `~/.claude/skills/` contains a `.claude-plugin/plugin.json`, Claude Code automatically recognizes and loads it as a "skills-dir plugin" (`apple-calendar@skills-dir`) — no marketplace add/install step needed.

Either way, restart Claude Code (start a new session) for the skill to load. The first time a script runs, macOS will prompt for Calendar/Reminders access — you need to allow it (System Settings > Privacy & Security > Calendars / Reminders).

## Usage examples

```
"Schedule a team meeting tomorrow at 3pm"
"Add a reminder to buy groceries this weekend"
"What's on my calendar today?"
"Move that meeting I just created to 7pm"
```

Create/update/delete requests always show a plan (title/time/calendar/location, etc.) and wait for confirmation before running. Read/search requests run immediately.

## How it works

It drives both apps directly via `osascript -l JavaScript` (JXA). JXA is used instead of plain AppleScript because date literals in AppleScript depend on the system locale; JXA uses the standard JS `Date` object instead, which avoids that class of bug.

| Script | Role |
|---|---|
| `scripts/list_calendars.js` | List calendars that actually exist |
| `scripts/list_reminder_lists.js` | List reminder lists that actually exist |
| `scripts/find_events.js` | Search events by date range/keyword |
| `scripts/find_reminders.js` | Search reminders by date range/keyword |
| `scripts/create_event.js` | Create an event (supports all-day) |
| `scripts/create_reminder.js` | Create a reminder |
| `scripts/update_event.js` / `update_reminder.js` | Update an existing item |
| `scripts/delete_event.js` / `delete_reminder.js` | Delete an item |
| `scripts/move_event.js` | Move an event to a different calendar |

Each script is an executable file (`chmod +x` already applied) and can be called directly: `./scripts/list_calendars.js`. Argument/return formats are tabulated in `SKILL.md` section 5.

## Category mapping

`mapping/category_map.json` holds keyword → calendar/list name hints for more accurate classification. Right after install it only has example values — update it with the calendar/list names that actually exist in your environment (it still works without this, falling back to a live lookup + inference).

## Known limitations

- **Can't target a specific account**: Calendar.app's scripting interface has no concept of an account (iCloud, etc.), so new calendars always get created in the default location (usually local). To move one to a specific account, create it manually in that account's section in Calendar.app's GUI, then use `move_event.js` to move events into it (see `SKILL.md` section 8 for details).
- **`move_event.js` changes the uid**: Calendar.app's `move` command isn't actually implemented for the event class, so this works by recreating the event in the destination calendar and deleting the original.
- macOS only. Requires Calendar.app / Reminders.app to be installed.
