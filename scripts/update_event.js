#!/usr/bin/osascript -l JavaScript
function run(argv) {
  const args = parseArgs(argv);
  if (!args.uid || !args.calendar) throw new Error('--uid and --calendar required');

  const Calendar = Application('Calendar');
  const cals = Calendar.calendars.whose({ name: args.calendar })();
  if (cals.length === 0) throw new Error('Calendar not found: ' + args.calendar);
  const events = cals[0].events.whose({ uid: args.uid })();
  if (events.length === 0) throw new Error('Event not found: ' + args.uid);
  const e = events[0];

  if (args.title) e.summary = args.title;
  if (args.start) e.startDate = new Date(args.start);
  if (args.end) e.endDate = new Date(args.end);
  if (args.location) e.location = args.location;
  if (args.notes) e.description = args.notes;

  Calendar.save(); // property edits on an existing event need an explicit save to persist
  return JSON.stringify({ ok: true });
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].indexOf('--') === 0) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.indexOf('--') === 0) {
        out[key] = true;
        continue;
      }
      out[key] = next;
      i++;
    }
  }
  return out;
}
