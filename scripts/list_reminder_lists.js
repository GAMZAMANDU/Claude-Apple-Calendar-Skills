#!/usr/bin/osascript -l JavaScript
function run(argv) {
  const Reminders = Application('Reminders');
  const lists = Reminders.lists();
  const result = lists.map(l => {
    let color = null;
    try { color = String(l.color()); } catch (e) {}
    return { name: l.name(), color: color };
  });
  return JSON.stringify(result);
}
