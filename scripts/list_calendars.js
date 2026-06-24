#!/usr/bin/osascript -l JavaScript
function run(argv) {
  const Calendar = Application('Calendar');
  const cals = Calendar.calendars();
  const result = cals.map(c => {
    let color = null;
    try { color = String(c.color()); } catch (e) {}
    return { name: c.name(), color: color };
  });
  return JSON.stringify(result);
}
