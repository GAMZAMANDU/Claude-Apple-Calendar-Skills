#!/usr/bin/osascript -l JavaScript
function run(argv) {
  const args = parseArgs(argv);
  if (!args.name || !args.list) throw new Error('--name and --list required');

  const Reminders = Application('Reminders');
  const lists = Reminders.lists.whose({ name: args.list })();
  if (lists.length === 0) throw new Error('List not found: ' + args.list);
  const list = lists[0];

  const props = { name: args.name };
  if (args.due) props.dueDate = new Date(args.due);
  if (args['remind-at']) props.remindMeDate = new Date(args['remind-at']);
  if (args.notes) props.body = args.notes;
  if (args.priority) props.priority = parseInt(args.priority, 10);

  const newReminder = Reminders.Reminder(props);
  list.reminders.push(newReminder);

  return JSON.stringify({ id: newReminder.id() });
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
