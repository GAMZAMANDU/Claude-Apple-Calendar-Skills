#!/usr/bin/osascript -l JavaScript
function run(argv) {
  const args = parseArgs(argv);
  const Reminders = Application('Reminders');
  let lists = Reminders.lists();
  if (args.list) lists = lists.filter(l => l.name() === args.list);
  const from = args.from ? new Date(args.from) : null;
  const to = args.to ? new Date(args.to) : null;

  const out = [];
  lists.forEach(list => {
    let rems;
    try {
      // push the completed-filter into Reminders itself instead of pulling
      // every item and asking .completed() one at a time (very slow bridge)
      rems = args['include-completed']
        ? list.reminders()
        : list.reminders.whose({ completed: false })();
    } catch (e) {
      rems = [];
    }
    rems.forEach(r => {
      // .properties() fetches all fields in one round trip instead of
      // five (name/due/remindAt/priority/completed each separately)
      let p;
      try { p = r.properties(); } catch (e) { return; }

      const name = p.name;
      if (args.query && !name.toLowerCase().includes(String(args.query).toLowerCase())) return;

      const due = p.dueDate ? p.dueDate.toISOString() : null;
      const remindAt = p.remindMeDate ? p.remindMeDate.toISOString() : null;

      if (from && due && new Date(due) < from) return;
      if (to && due && new Date(due) > to) return;

      out.push({
        id: p.id,
        name: name,
        due: due,
        remindAt: remindAt,
        list: list.name(),
        completed: p.completed,
        priority: p.priority
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
