(() => {
  'use strict';

  const CONFIG = {
    // Google Apps Script web app URL that stores RSVPs and wishes (see README). Empty = nothing is sent anywhere.
    formEndpoint: '',
    calendarTimezone: 'Asia/Ho_Chi_Minh',
    eventDurationHours: 2,
    albumAutoplayMs: 3500,
  };

  const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const HEAVENLY_STEMS = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const EARTHLY_BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const SAMPLE_WISHES = [
    'Chúc hai bạn trăm năm hạnh phúc, sớm có thiên thần nhỏ nhé! 💕',
    'Chúc mừng hạnh phúc! Chúc hai bạn bạc đầu nghĩa phu thê, đồng hành trọn đời.',
    'Chúc đôi uyên ương luôn yêu thương, thấu hiểu và cùng nhau vượt qua mọi thử thách.',
    'Mừng ngày vui của hai bạn! Chúc tổ ấm mới luôn ngập tràn tiếng cười.',
    'Chúc cô dâu chú rể trăm năm hạnh phúc, mãi mãi bên nhau như ngày đầu.',
    'Chúc hai bạn có một đám cưới thật trọn vẹn và một cuộc sống hôn nhân viên mãn.',
    'Chúc mừng hai bạn đã tìm được một nửa của mình. Hạnh phúc thật nhiều nhé!',
    'Chúc gia đình nhỏ luôn bình an, ấm áp và tràn đầy yêu thương.',
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pad = (n) => String(n).padStart(2, '0');
  const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Lunar calendar (Ho Ngoc Duc's algorithm, Vietnam time zone UTC+7) ---------- */

  const VN_TIMEZONE = 7;

  function julianDay(dd, mm, yy) {
    const a = Math.floor((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    if (jd < 2299161) jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    return jd;
  }

  function newMoonDay(k) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = Math.PI / 180;
    let jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    jd += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let c = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    c = c - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    c -= 0.0004 * Math.sin(dr * 3 * Mpr);
    c = c + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    c = c - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    c = c - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    c = c + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    const deltaT = T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return Math.floor(jd + c - deltaT + 0.5 + VN_TIMEZONE / 24);
  }

  function sunLongitudeSegment(dayNumber) {
    const T = (dayNumber - 0.5 - VN_TIMEZONE / 24 - 2451545.0) / 36525;
    const T2 = T * T;
    const dr = Math.PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let dl = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    dl += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    let L = (L0 + dl) * dr;
    L -= Math.PI * 2 * Math.floor(L / (Math.PI * 2));
    return Math.floor((L / Math.PI) * 6);
  }

  function lunarMonth11Start(yy) {
    const k = Math.floor((julianDay(31, 12, yy) - 2415021) / 29.530588853);
    const newMoon = newMoonDay(k);
    return sunLongitudeSegment(newMoon) >= 9 ? newMoonDay(k - 1) : newMoon;
  }

  function leapMonthOffset(month11Start) {
    const k = Math.floor((month11Start - 2415021.076998695) / 29.530588853 + 0.5);
    let i = 1;
    let arc = sunLongitudeSegment(newMoonDay(k + i));
    let last;
    do {
      last = arc;
      i += 1;
      arc = sunLongitudeSegment(newMoonDay(k + i));
    } while (arc !== last && i < 14);
    return i - 1;
  }

  function solarToLunar(dd, mm, yy) {
    const dayNumber = julianDay(dd, mm, yy);
    const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = newMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = newMoonDay(k);
    let a11 = lunarMonth11Start(yy);
    let b11 = a11;
    let year;
    if (a11 >= monthStart) {
      year = yy;
      a11 = lunarMonth11Start(yy - 1);
    } else {
      year = yy + 1;
      b11 = lunarMonth11Start(yy + 1);
    }
    const day = dayNumber - monthStart + 1;
    const diff = Math.floor((monthStart - a11) / 29);
    let month = diff + 11;
    let leap = false;
    if (b11 - a11 > 365) {
      const leapDiff = leapMonthOffset(a11);
      if (diff >= leapDiff) {
        month = diff + 10;
        leap = diff === leapDiff;
      }
    }
    if (month > 12) month -= 12;
    if (month >= 11 && diff < 4) year -= 1;
    return { day, month, year, leap };
  }

  function lunarYearName(year) {
    return `${HEAVENLY_STEMS[(year + 6) % 10]} ${EARTHLY_BRANCHES[(year + 8) % 12]}`;
  }

  /* ---------- Dates ---------- */

  function parseDateTime(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value || '');
    if (!match) return null;
    const [, y, m, d, hh = '0', mm = '0'] = match;
    return { y: +y, m: +m, d: +d, hh: +hh, mm: +mm };
  }

  function eventDateTime(el) {
    const source = el.dataset.dateFrom ? $(el.dataset.dateFrom) : el;
    return parseDateTime(source && source.dataset.datetime);
  }

  function weekdayOf(dt) {
    return new Date(Date.UTC(dt.y, dt.m - 1, dt.d)).getUTCDay();
  }

  function fillEventDates() {
    $$('[data-datetime], [data-date-from]').forEach((el) => {
      const dt = eventDateTime(el);
      if (!dt) return;
      const lunar = solarToLunar(dt.d, dt.m, dt.y);
      const parts = {
        time: `${pad(dt.hh)}:${pad(dt.mm)}`,
        weekday: WEEKDAYS[weekdayOf(dt)],
        day: pad(dt.d),
        month: `Tháng ${dt.m}`,
        year: String(dt.y),
        long: `${dt.d} tháng ${dt.m}, ${dt.y}`,
        'month-title': `Tháng ${dt.m} / ${dt.y}`,
        lunar: `(Tức ngày ${lunar.day} tháng ${lunar.month}${lunar.leap ? ' nhuận' : ''} năm ${lunarYearName(lunar.year)})`,
      };
      $$('[data-part]', el).forEach((part) => {
        if (part.dataset.part in parts) part.textContent = parts[part.dataset.part];
      });
    });
  }

  function renderCalendar() {
    const calendar = $('#calendar');
    const days = $('#calendar-days');
    const dt = calendar && eventDateTime(calendar);
    if (!dt || !days) return;
    const leadingBlanks = (new Date(Date.UTC(dt.y, dt.m - 1, 1)).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(dt.y, dt.m, 0)).getUTCDate();
    const cells = Array.from({ length: leadingBlanks }, () => '<span class="calendar__day"></span>');
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(d === dt.d
        ? `<span class="calendar__day"><span class="calendar__heart" title="Ngày cưới">${icon('i-heart')}<b>${d}</b></span></span>`
        : `<span class="calendar__day">${d}</span>`);
    }
    days.innerHTML = cells.join('');
  }

  function linkAddToCalendar() {
    const link = $('#add-to-calendar');
    const dt = link && eventDateTime(link);
    if (!dt) return;
    const end = new Date(Date.UTC(dt.y, dt.m - 1, dt.d, dt.hh + CONFIG.eventDurationHours, dt.mm));
    const stamp = (y, m, d, hh, mm) => `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
    const venue = link.dataset.locationFrom ? $(link.dataset.locationFrom) : null;
    const location = venue ? venue.textContent.trim() : '';
    const title = link.dataset.title || document.title;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${stamp(dt.y, dt.m, dt.d, dt.hh, dt.mm)}/${stamp(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), end.getUTCHours(), end.getUTCMinutes())}`,
      ctz: CONFIG.calendarTimezone,
      details: location ? `${title} tại ${location}` : title,
      location,
    });
    link.href = `https://calendar.google.com/calendar/render?${params}`;
  }

  /* ---------- Cover & music ---------- */

  function setupMusic() {
    const audio = $('#bg-music');
    const button = $('#music-toggle');
    if (!audio || !button) return { play() {} };
    const sync = () => {
      const playing = !audio.paused;
      button.classList.toggle('is-playing', playing);
      button.setAttribute('aria-pressed', String(playing));
    };
    const showButton = () => { button.hidden = false; };
    if (audio.readyState > 0) showButton();
    audio.addEventListener('loadedmetadata', showButton);
    audio.addEventListener('play', sync);
    audio.addEventListener('pause', sync);
    button.addEventListener('click', () => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });
    return { play: () => audio.play().catch(() => {}) };
  }

  function burstHearts(origin) {
    const rect = origin.getBoundingClientRect();
    const colors = ['#a8323b', '#c9a24a', '#ece4d8', '#7a1f26', '#e8b4b8'];
    for (let i = 0; i < 18; i += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const distance = 80 + Math.random() * 140;
      const heart = document.createElement('span');
      heart.className = 'burst-heart';
      heart.innerHTML = icon('i-heart');
      heart.style.cssText = [
        `left:${rect.left + rect.width / 2}px`,
        `top:${rect.top + rect.height / 2}px`,
        `--size:${12 + Math.random() * 14}px`,
        `--c:${colors[i % colors.length]}`,
        `--tx:${Math.cos(angle) * distance}px`,
        `--ty:${Math.sin(angle) * distance}px`,
        `--r:${(Math.random() - 0.5) * 120}deg`,
        `--delay:${Math.random() * 0.15}s`,
      ].join(';');
      heart.addEventListener('animationend', () => heart.remove());
      document.body.appendChild(heart);
    }
  }

  function setupCover(music, onOpened) {
    const cover = $('#cover');
    const button = $('#open-invitation');
    const reveal = () => {
      document.body.classList.add('is-open');
      onOpened();
    };
    const unlock = () => {
      if (cover) cover.hidden = true;
      document.body.classList.remove('is-locked');
    };
    if (!cover || !button) {
      reveal();
      unlock();
      return;
    }
    button.addEventListener('click', () => {
      if (cover.classList.contains('is-opening')) return;
      music.play();
      if (!reducedMotion) burstHearts(button);
      cover.classList.add('is-opening');
      window.setTimeout(reveal, reducedMotion ? 0 : 1000);
      window.setTimeout(unlock, reducedMotion ? 50 : 1800);
    });
  }

  /* ---------- Album & lightbox ---------- */

  function onSwipe(element, handler) {
    let startX = null;
    let swiped = false;
    element.addEventListener('pointerdown', (event) => {
      startX = event.clientX;
      swiped = false;
    });
    element.addEventListener('pointerup', (event) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) {
        swiped = true;
        handler(dx < 0 ? 1 : -1);
      }
    });
    element.addEventListener('pointercancel', () => { startX = null; });
    return () => swiped;
  }

  function setupAlbum(openLightbox) {
    const root = $('#coverflow');
    const items = root ? $$('.coverflow__item', root) : [];
    const counter = $('#album-counter');
    const count = items.length;
    let active = 0;
    let timer = null;
    if (!count) return { pause() {}, resume() {} };

    const offsetOf = (index) => {
      let d = index - active;
      if (d > count / 2) d -= count;
      if (d < -count / 2) d += count;
      return d;
    };

    const layout = () => {
      items.forEach((item, index) => {
        const d = offsetOf(index);
        const distance = Math.abs(d);
        const scale = distance === 0 ? 1 : distance === 1 ? 0.85 : 0.7;
        item.style.transform = `translateX(${d * 60}%) translateZ(${-150 * distance}px) rotateY(${d * 45}deg) scale(${scale})`;
        item.style.opacity = String([1, 0.75, 0.5, 0.3][distance] ?? 0);
        item.style.zIndex = String(100 - distance);
        item.tabIndex = d === 0 ? 0 : -1;
        item.classList.toggle('is-active', d === 0);
      });
      if (counter) counter.textContent = `${active + 1} / ${count}`;
    };

    const goTo = (index) => {
      active = (index + count) % count;
      layout();
    };
    const pause = () => {
      window.clearInterval(timer);
      timer = null;
    };
    const resume = () => {
      pause();
      if (!reducedMotion && count > 1) timer = window.setInterval(() => goTo(active + 1), CONFIG.albumAutoplayMs);
    };

    const wasSwiped = onSwipe(root, (step) => {
      goTo(active + step);
      resume();
    });

    items.forEach((item, index) => {
      const img = $('img', item);
      const matchPhotoShape = () => {
        if (img.naturalWidth) item.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      };
      if (img.complete) matchPhotoShape();
      else img.addEventListener('load', matchPhotoShape);

      item.addEventListener('click', () => {
        if (wasSwiped()) return;
        if (offsetOf(index) === 0) {
          pause();
          openLightbox(index);
        } else {
          goTo(index);
          resume();
        }
      });
    });

    root.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
      items[active].focus({ preventScroll: true });
      resume();
    });

    document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
    layout();
    resume();
    return { pause, resume };
  }

  function setupLightbox(onClose) {
    const dialog = $('#lightbox');
    const image = $('#lightbox-img');
    const counter = $('#lightbox-counter');
    const thumbs = $('#lightbox-thumbs');
    const stage = $('#lightbox-stage');
    const photos = $$('#coverflow img').map((img) => ({ src: img.getAttribute('src'), alt: img.alt }));
    if (!dialog || !photos.length) return () => {};
    let index = 0;

    const show = (next) => {
      index = (next + photos.length) % photos.length;
      image.src = photos[index].src;
      image.alt = photos[index].alt;
      counter.textContent = `${index + 1} / ${photos.length}`;
      Array.from(thumbs.children).forEach((thumb, n) => thumb.classList.toggle('is-active', n === index));
      const current = thumbs.children[index];
      if (current) thumbs.scrollTo({ left: current.offsetLeft - (thumbs.clientWidth - current.clientWidth) / 2, behavior: 'smooth' });
    };

    photos.forEach((photo, n) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'lightbox__thumb';
      thumb.setAttribute('aria-label', `Xem ảnh ${n + 1}`);
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = '';
      img.loading = 'lazy';
      thumb.append(img);
      thumb.addEventListener('click', () => show(n));
      thumbs.append(thumb);
    });

    $('#lightbox-prev').addEventListener('click', () => show(index - 1));
    $('#lightbox-next').addEventListener('click', () => show(index + 1));
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') show(index - 1);
      if (event.key === 'ArrowRight') show(index + 1);
    });
    const wasSwiped = onSwipe(stage, (step) => show(index + step));
    dialog.addEventListener('click', (event) => {
      const onEmptySpace = event.target === stage || event.target === dialog || event.target.classList.contains('lightbox__inner');
      if (onEmptySpace && !wasSwiped()) dialog.close();
    });
    dialog.addEventListener('close', onClose);

    return (start) => {
      show(start);
      dialog.showModal();
    };
  }

  /* ---------- Dialogs, RSVP, guestbook, gift ---------- */

  function setupDialogs() {
    $$('[data-open-dialog]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const dialog = $(`#${trigger.dataset.openDialog}`);
        if (dialog && !dialog.open) dialog.showModal();
      });
    });
    $$('[data-close-dialog]').forEach((button) => {
      button.addEventListener('click', () => button.closest('dialog')?.close());
    });
    $$('dialog.dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  async function sendToSheet(payload) {
    if (!CONFIG.formEndpoint) {
      console.info('[wedding] CONFIG.formEndpoint is empty, so this submission was not stored:', payload);
      return true;
    }
    try {
      const response = await fetch(CONFIG.formEndpoint, { method: 'POST', body: new URLSearchParams(payload) });
      return response.ok;
    } catch (error) {
      console.error('[wedding] submission failed', error);
      return false;
    }
  }

  function setupRsvp() {
    const dialog = $('#rsvp-dialog');
    const form = $('#rsvp-form');
    const done = $('#rsvp-done');
    const doneText = $('#rsvp-done-text');
    const error = $('#rsvp-error');
    if (!dialog || !form) return;
    const submit = $('.sheet__submit', form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const attending = data.get('attending');
      if (!name || !attending) {
        form.reportValidity();
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Đang gửi...';
      error.hidden = true;
      const sent = await sendToSheet({ type: 'rsvp', name, attending: attending === 'yes' ? 'Có' : 'Không' });
      submit.disabled = false;
      submit.textContent = 'Gửi xác nhận';
      if (!sent) {
        error.hidden = false;
        return;
      }
      doneText.textContent = attending === 'yes'
        ? `Cảm ơn ${name} đã xác nhận. Hẹn gặp bạn trong ngày vui của tụi mình nhé!`
        : `Cảm ơn ${name} đã báo cho tụi mình biết. Mong sớm được gặp lại bạn!`;
      form.hidden = true;
      done.hidden = false;
    });

    dialog.addEventListener('close', () => {
      if (done.hidden) return;
      form.reset();
      form.hidden = false;
      done.hidden = true;
    });
  }

  function formatWishTime(date) {
    return `${date.getHours()}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  function renderWish({ name, message, time }) {
    const item = document.createElement('article');
    item.className = 'wish';
    const head = document.createElement('div');
    head.className = 'wish__head';
    const author = document.createElement('span');
    author.className = 'wish__name';
    author.textContent = name;
    const when = document.createElement('time');
    when.className = 'wish__time';
    const date = time instanceof Date ? time : new Date(time);
    if (!Number.isNaN(date.getTime())) {
      when.dateTime = date.toISOString();
      when.textContent = formatWishTime(date);
    }
    head.append(author, when);
    const text = document.createElement('p');
    text.className = 'wish__message';
    text.textContent = message;
    item.append(head, text);
    return item;
  }

  async function loadWishes(list) {
    if (!CONFIG.formEndpoint) return;
    try {
      const response = await fetch(`${CONFIG.formEndpoint}?type=wish`);
      if (!response.ok) return;
      const wishes = await response.json();
      if (!Array.isArray(wishes)) return;
      list.replaceChildren(...wishes.filter((wish) => wish && wish.name && wish.message).map(renderWish));
    } catch (error) {
      console.error('[wedding] could not load wishes', error);
    }
  }

  function setupGuestbook() {
    const form = $('#wish-form');
    const list = $('#wish-list');
    const status = $('#wish-status');
    if (!form || !list) return;
    const submit = $('button[type="submit"]', form);
    let lastSuggestion = -1;

    $('#suggest-wish')?.addEventListener('click', () => {
      let next = lastSuggestion;
      while (next === lastSuggestion) next = Math.floor(Math.random() * SAMPLE_WISHES.length);
      lastSuggestion = next;
      form.elements.message.value = SAMPLE_WISHES[next];
      form.elements.message.focus();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = form.elements.name.value.trim();
      const message = form.elements.message.value.trim();
      if (!name || !message) {
        status.textContent = 'Bạn nhập tên và lời chúc giúp mình nhé.';
        return;
      }
      submit.disabled = true;
      status.textContent = 'Đang gửi lời chúc...';
      const sent = await sendToSheet({ type: 'wish', name, message });
      submit.disabled = false;
      if (!sent) {
        status.textContent = 'Gửi chưa thành công, bạn thử lại giúp mình nhé.';
        return;
      }
      list.prepend(renderWish({ name, message, time: new Date() }));
      form.reset();
      status.textContent = 'Cảm ơn lời chúc của bạn! 💌';
    });

    loadWishes(list);
  }

  function setupGiftBox() {
    const box = $('#giftbox');
    const dialog = $('#gift-dialog');
    if (!box || !dialog) return;
    box.addEventListener('click', () => {
      box.classList.remove('is-bursting');
      void box.offsetWidth;
      box.classList.add('is-bursting');
      window.setTimeout(() => {
        if (!dialog.open) dialog.showModal();
      }, reducedMotion ? 0 : 600);
    });
  }

  function setupReveal() {
    const targets = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    targets.forEach((target) => observer.observe(target));
  }

  /* ---------- Start ---------- */

  fillEventDates();
  renderCalendar();
  linkAddToCalendar();
  setupDialogs();
  setupRsvp();
  setupGuestbook();
  setupGiftBox();

  let album = null;
  const openLightbox = setupLightbox(() => album && album.resume());
  album = setupAlbum(openLightbox);

  setupCover(setupMusic(), setupReveal);
})();
