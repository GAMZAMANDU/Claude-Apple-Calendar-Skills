#!/usr/bin/osascript -l JavaScript
function run(argv) {
  const args = parseArgs(argv);
  ['uid', 'from-calendar', 'to-calendar'].forEach(k => {
    if (!args[k]) throw new Error('--' + k + ' required');
  });

  const Calendar = Application('Calendar');
  const fromCals = Calendar.calendars.whose({ name: args['from-calendar'] })();
  if (fromCals.length === 0) throw new Error('Calendar not found: ' + args['from-calendar']);
  const toCals = Calendar.calendars.whose({ name: args['to-calendar'] })();
  if (toCals.length === 0) throw new Error('Calendar not found: ' + args['to-calendar']);

  const events = fromCals[0].events.whose({ uid: args.uid })();
  if (events.length === 0) throw new Error('Event not found: ' + args.uid);
  const src = events[0];
  const p = src.properties();

  // Calendar.app's generic `move` command errors on events (-10014 / -1700
  // observed) -- it isn't actually implemented for this class, so we
  // re-create the event in the destination calendar and delete the source.
  const props = {
    summary: p.summary,
    startDate: p.startDate,
    endDate: p.endDate,
    alldayEvent: p.alldayEvent
  };
  if (p.location) props.location = p.location;
  if (p.description) props.description = p.description;

  const newEvent = Calendar.Event(props);
  toCals[0].events.push(newEvent);

  let alarms = [];
  try { alarms = src.displayAlarms(); } catch (e) {}
  alarms.forEach(a => {
    const newAlarm = Calendar.DisplayAlarm({ triggerInterval: a.triggerInterval() });
    newEvent.displayAlarms.push(newAlarm);
  });

  Calendar.delete(src);
  Calendar.save();

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
