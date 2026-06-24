#!/usr/bin/osascript -l JavaScript
function run(argv) {
  const args = parseArgs(argv);
  if (!args.from || !args.to) throw new Error('--from and --to required (ISO8601)');
  const from = new Date(args.from);
  const to = new Date(args.to);
  const Calendar = Application('Calendar');
  let cals = Calendar.calendars();
  if (args.calendar) cals = cals.filter(c => c.name() === args.calendar);

  const out = [];
  cals.forEach(cal => {
    let evts;
    try {
      // overlap with [from, to): startDate < to AND endDate > from
      evts = cal.events.whose({
        _and: [
          { startDate: { _lessThan: to } },
          { endDate: { _greaterThan: from } }
        ]
      })();
    } catch (e) {
      evts = [];
    }
    evts.forEach(e => {
      // .properties() fetches all fields in one round trip instead of five
      let p;
      try { p = e.properties(); } catch (err) { return; }
      if (args.query && !p.summary.toLowerCase().includes(String(args.query).toLowerCase())) return;
      out.push({
        uid: p.uid,
        summary: p.summary,
        start: p.startDate.toISOString(),
        end: p.endDate.toISOString(),
        calendar: cal.name(),
        location: p.location || null
      });
    });
  });
  return JSON.stringify(out);
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
