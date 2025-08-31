# BPIT_Calendar
A simple booking calendar.


Options:

mode:
DEFAULT: "day"
"day" - Only a date selector
"time" - A time selector appears next to the dates

lockedDates:
DEFAULT: []
[] - Exact dates of the locked days:
lockedDates: ["2025-08-22", "2025-08-25"],

lockedDay:
DEFAULT: []
[] - Days that will be locked (Fe: Every Sunday, or every second Saturday)


timeSlots:
DEFAULT: []
[] - Available Time Periods type by hand:
timeSlots: ["09:00 - 12:00", "13:00 - 16:00", "17:00 - 20:00"],

startWeekOnMonday:
DEFAULT: true
true - Weeks starts on Monday
false - Weeks starts on Sunday

lang:
DEFAULT: "en"
"en" - English
"hu" - Hungarian

onSelect:
Event for the selection









const calendar = new Calendar("#calendar", {
  mode: "time",                  // "day" (just pick date) or "time" (date + time)
  firstDate: new Date(),         // earliest selectable date
  lastDate: new Date(2025, 11, 31), // latest selectable date
  lang: "en",                    // "en" or "hu"
  startWeekOnMonday: true,       // true = Monday first, false = Sunday first

  // Lock options
  lockedDates: ["2025-08-25"],   // specific YYYY-MM-DD dates locked
  lockedDay: [0, 6],             // lock Sunday(0) & Saturday(6)
  lockedDayPeriod: [2],          // lock every 2nd week for the given weekday(s)
  lockedTimes: {
    "2025-08-21": ["09:00", "10:00"],
    "2025-08-22": ["14:00"]
  },

  // Time settings
  startTime: "08:00",            // earliest slot
  endTime: "18:00",              // latest slot
  bookTimePeriod: 60,            // slot length in minutes
  perDayOverrides: {             // override times for special days
    "2025-08-22": {
      startTime: "10:00",
      endTime: "15:00",
      bookTimePeriod: 30
    }
  },

  // Event callback
  onSelect: (data) => console.log("Selected:", data)
});
