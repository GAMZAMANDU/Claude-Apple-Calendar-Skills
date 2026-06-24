#!/usr/bin/osascript -l JavaScript
function run(argv) {
  const args = parseArgs(argv);
  if (!args.id) throw new Error('--id required');

  const Reminders = Application('Reminders');
  const rems = Reminders.reminders.whose({ id: args.id })();
  if (rems.length === 0) throw new Error('Reminder not found: ' + args.id);

  Reminders.delete(rems[0]);
  Reminders.save();
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
