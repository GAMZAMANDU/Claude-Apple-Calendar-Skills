#!/usr/bin/osascript -l JavaScript
function run(argv) {
  const args = parseArgs(argv);
  ['title', 'start', 'end', 'calendar'].forEach(k => {
    if (!args[k]) throw new Error('--' + k + ' required');
  });

  const Calendar = Application('Calendar');
  const cals = Calendar.calendars.whose({ name: args.calendar })();
  if (cals.length === 0) throw new Error('Calendar not found: ' + args.calendar);
  const cal = cals[0];

  const props = {
    summary: args.title,
    startDate: new Date(args.start),
    endDate: new Date(args.end)
  };
  if (args.location) props.location = args.location;
  if (args.notes) props.description = args.notes;
  if (args.allday) props.alldayEvent = true;

  const newEvent = Calendar.Event(props);
  cal.events.push(newEvent);

  if (args['alarm-minutes-before']) {
    const minutes = parseInt(args['alarm-minutes-before'], 10);
    // negative triggerInterval = before the event (per Calendar.app sdef)
    const alarm = Calendar.DisplayAlarm({ triggerInterval: -Math.abs(minutes) });
    newEvent.displayAlarms.push(alarm);
  }

  return JSON.stringify({ uid: newEvent.uid() });
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
