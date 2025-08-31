class Calendar {
  constructor(selector, options = {}) {
    this.container =
      typeof selector === "string" ? document.querySelector(selector) : selector;

    this.translations = {
      en: {
        weekdays: ["M", "T", "W", "T", "F", "S", "S"],
        weekdays_sunFirst: ["S", "M", "T", "W", "T", "F", "S"],
        months: [
          "January","February","March","April","May","June",
          "July","August","September","October","November","December"
        ],
        noDateSelected: "Select a date to see available times.",
        timesFor: "Available times for"
      },
      hu: {
        weekdays: ["H", "K", "S", "Cs", "P", "Sz", "V"],
        weekdays_sunFirst: ["V", "H", "K", "S", "Cs", "P", "Sz"],
        months: [
          "Január","Február","Március","Április","Május","Június",
          "Július","Augusztus","Szeptember","Október","November","December"
        ],
        noDateSelected: "Válasszon dátumot az időpontokhoz.",
        timesFor: "Elérhető időpontok:"
      }
    };

    const today = new Date();

    this.options = Object.assign(
      {
        mode: "day",
        lockedDates: [],        // ["2025-08-22"]
        lockedDay: [],          // [0,6] = lock Sun + Sat
        lockedDayPeriod: [],    // [2,4] = lock 2nd + 4th week occurrences
        lockedTimes: {},        // { "2025-08-25": ["09:00","10:00"] }
        firstDate: today,
        lastDate: null,
        timeSlots: [], // legacy
        startTime: "08:00",
        endTime: "18:00",
        bookTimePeriod: 60, // minutes
        perDayOverrides: {}, // { "2025-08-22": {startTime:"10:00",endTime:"15:00",bookTimePeriod:30} }
        startWeekOnMonday: true,
        lang: "en",
        onSelect: () => {}
      },
      options
    );

    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.selectedDate = null;

    this.render();
  }

  // 🔹 Convert date to Budapest YYYY-MM-DD
  getDateStr(dateObj) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Budapest",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(dateObj);

    const y = parts.find(p => p.type === "year").value;
    const m = parts.find(p => p.type === "month").value;
    const d = parts.find(p => p.type === "day").value;

    return `${y}-${m}-${d}`;
  }

  render() {
    const t = this.translations[this.options.lang] || this.translations.en;
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "calendar-wrapper";

    const calendarBox = document.createElement("div");
    calendarBox.className = "calendar-box";

    // header
    const header = document.createElement("div");
    header.className = "calendar-header";

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "◀";
    prevBtn.addEventListener("click", () => this.changeMonth(-1));

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "▶";
    nextBtn.addEventListener("click", () => this.changeMonth(1));

    const title = document.createElement("span");
    title.className = "calendar-title";
    title.textContent = `${t.months[this.currentMonth]} ${this.currentYear}`;

    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    calendarBox.appendChild(header);

    // weekdays
    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "calendar-weekdays";
    const weekdays = this.options.startWeekOnMonday
      ? t.weekdays
      : t.weekdays_sunFirst;
    weekdays.forEach((day) => {
      const wd = document.createElement("div");
      wd.className = "calendar-weekday";
      wd.textContent = day;
      weekdaysRow.appendChild(wd);
    });
    calendarBox.appendChild(weekdaysRow);

    // days
    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    let startDay = firstDay.getDay();
    if (this.options.startWeekOnMonday) startDay = (startDay + 6) % 7;

    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    for (let i = 0; i < startDay; i++) {
      const empty = document.createElement("div");
      empty.className = "calendar-cell empty";
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(this.currentYear, this.currentMonth, d);
      const dateStr = this.getDateStr(dateObj);
      const weekday = dateObj.getDay(); // 0=Sun

      const cell = document.createElement("div");
      cell.className = "calendar-cell";
      cell.textContent = d;

      // 🔹 LOCK RULES
      let locked = false;

      // before firstDate or after lastDate
      if (
        (this.options.firstDate &&
          dateObj < new Date(this.options.firstDate.getFullYear(), this.options.firstDate.getMonth(), this.options.firstDate.getDate())) ||
        (this.options.lastDate &&
          dateObj > new Date(this.options.lastDate.getFullYear(), this.options.lastDate.getMonth(), this.options.lastDate.getDate()))
      ) locked = true;

      // lockedDates
      if (this.options.lockedDates.includes(dateStr)) locked = true;

      // lockedDay
      if (this.options.lockedDay.includes(weekday)) locked = true;

      // lockedDayPeriod (e.g. every 2nd Monday)
      if (this.options.lockedDay.length && this.options.lockedDayPeriod.length) {
        const weekNumber = Math.ceil(d / 7); // 1st, 2nd, etc.
        if (this.options.lockedDay.includes(weekday) &&
            this.options.lockedDayPeriod.includes(weekNumber)) locked = true;
      }

      // mark selected
      if (this.selectedDate === dateStr) cell.classList.add("selected");

      if (locked) {
        cell.classList.add("locked");
      } else {
        cell.addEventListener("click", () => {
          this.selectedDate = dateStr;
          this.render();
          if (this.options.mode === "day") {
            this.options.onSelect(dateStr);
          } else {
            this.showTimeSlots(dateStr);
          }
        });
      }

      grid.appendChild(cell);
    }

    calendarBox.appendChild(grid);
    wrapper.appendChild(calendarBox);

    // time sidebar
    if (this.options.mode === "time") {
      this.timesSidebar = document.createElement("div");
      this.timesSidebar.className = "calendar-times";
      if (this.selectedDate) this.showTimeSlots(this.selectedDate);
      else this.timesSidebar.innerHTML = `<p>${t.noDateSelected}</p>`;
      wrapper.appendChild(this.timesSidebar);
    }

    this.container.appendChild(wrapper);
  }

  showTimeSlots(dateStr) {
    const t = this.translations[this.options.lang] || this.translations.en;
    if (!this.timesSidebar) return;
    this.timesSidebar.innerHTML = "";

    const title = document.createElement("h3");
    title.textContent = `${t.timesFor} ${dateStr}`;
    this.timesSidebar.appendChild(title);

    let { startTime, endTime, bookTimePeriod } = this.options;
    if (this.options.perDayOverrides[dateStr]) {
      const o = this.options.perDayOverrides[dateStr];
      startTime = o.startTime || startTime;
      endTime = o.endTime || endTime;
      bookTimePeriod = o.bookTimePeriod || bookTimePeriod;
    }

    const slots = this.generateTimeSlots(startTime, endTime, bookTimePeriod);

    slots.forEach((slot) => {
      const btn = document.createElement("button");
      btn.textContent = slot;

      if (
        this.options.lockedTimes[dateStr] &&
        this.options.lockedTimes[dateStr].includes(slot)
      ) {
        btn.classList.add("locked-time");
        btn.disabled = true;
      } else {
        btn.addEventListener("click", () => {
          // Remove previously selected
          const prev = this.timesSidebar.querySelector(".selected-time");
          if (prev) prev.classList.remove("selected-time");

          // Highlight current
          btn.classList.add("selected-time");

          // Call the callback
          this.options.onSelect({ date: dateStr, time: slot });
        });
      }

      this.timesSidebar.appendChild(btn);
    });
  }

  generateTimeSlots(start, end, period) {
    const slots = [];
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    let cur = new Date(2000, 0, 1, sh, sm);
    const endTime = new Date(2000, 0, 1, eh, em);

    while (cur <= endTime) {
      const hh = String(cur.getHours()).padStart(2, "0");
      const mm = String(cur.getMinutes()).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
      cur = new Date(cur.getTime() + period * 60000);
    }

    return slots;
  }

  changeMonth(offset) {
    let newMonth = this.currentMonth + offset;
    let newYear = this.currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    const firstDate = this.options.firstDate ? new Date(this.options.firstDate) : null;
    const lastDate = this.options.lastDate ? new Date(this.options.lastDate) : null;

    const firstAllowed = firstDate ? new Date(firstDate.getFullYear(), firstDate.getMonth(), 1) : null;
    const lastAllowed = lastDate ? new Date(lastDate.getFullYear(), lastDate.getMonth(), 1) : null;

    const candidate = new Date(newYear, newMonth, 1);
    if ((firstAllowed && candidate < firstAllowed) || (lastAllowed && candidate > lastAllowed)) return;

    this.currentMonth = newMonth;
    this.currentYear = newYear;
    this.render();
  }
}
