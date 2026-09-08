/* =============================================================
   Sorotan Digital — interaksi landing page + chat widget
   ============================================================= */
(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Backend Express jalan di port 3000. Kalau halaman ini dibuka langsung dari
     file:// atau lewat Live Server di port lain, arahkan API ke localhost:3000. */
  const API_BASE = (function () {
    if (!location.protocol.startsWith('http')) return 'http://localhost:3000';
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (isLocal && location.port !== '3000') return 'http://localhost:3000';
    return '';
  })();

  /* =========================================================
     1. NAVIGASI
     ========================================================= */
  const nav = $('#nav');
  const navLinks = $('#nav-links');
  const burger = $('#nav-burger');

  const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  });

  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  // Tandai menu yang sedang dilihat
  const sections = $$('main section[id]');
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = $(`.nav__links a[href="#${entry.target.id}"]`);
        $$('.nav__links a').forEach((a) => a.classList.remove('is-active'));
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => navObserver.observe(s));
  }

  /* =========================================================
     2. HERO CAROUSEL
     ========================================================= */
  const slides = $$('#carousel-viewport .slide');
  const dotsWrap = $('#carousel-dots');
  const carousel = $('#carousel');
  let current = 0;
  let timer = null;
  const DELAY = 6500;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.setAttribute('aria-selected', String(i === 0));
    dot.addEventListener('click', () => { goTo(i); restart(); });
    dotsWrap.appendChild(dot);
  });

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle('is-active', active);
      slide.toggleAttribute('aria-hidden', !active);
    });
    $$('button', dotsWrap).forEach((d, i) => d.setAttribute('aria-selected', String(i === current)));
    replayBars(slides[current]);
  }

  // Jalankan ulang animasi batang chart tiap slide-nya muncul
  function replayBars(slide) {
    if (reduceMotion) return;
    $$('.chart i', slide).forEach((bar, i) => {
      bar.style.setProperty('--i', i);
      bar.style.animation = 'none';
      void bar.offsetHeight;
      bar.style.animation = '';
    });
  }

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  function start() {
    if (reduceMotion || slides.length < 2) return;
    stop();
    timer = setInterval(next, DELAY);
  }
  function stop() { clearInterval(timer); timer = null; }
  function restart() { stop(); start(); }

  $$('[data-carousel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.dataset.carousel === 'next' ? next() : prev();
      restart();
    });
  });

  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  // Geser dengan sentuhan
  let touchX = null;
  carousel.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 45) { dx < 0 ? next() : prev(); restart(); }
    touchX = null;
  }, { passive: true });

  replayBars(slides[0]);
  start();

  /* =========================================================
     3. ANIMASI ANGKA STATISTIK
     ========================================================= */
  function formatCount(el, raw) {
    const decimal = Number(el.dataset.decimal || 0);
    const value = decimal ? (raw / Math.pow(10, decimal)) : raw;
    const body = decimal
      ? value.toFixed(decimal).replace('.', ',')
      : Math.round(value).toLocaleString('id-ID');
    return (el.dataset.prefix || '') + body + (el.dataset.suffix || '');
  }

  function animateCount(el) {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = formatCount(el, target); return; }
    const duration = 1300;
    const startAt = performance.now();
    (function tick(now) {
      // timestamp rAF bisa sedikit lebih awal dari startAt, jadi dijepit ke 0..1
      const p = Math.min(Math.max((now - startAt) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatCount(el, target * eased);
      if (p < 1) requestAnimationFrame(tick);
    })(startAt);
  }

  if ('IntersectionObserver' in window) {
    const statObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    $$('#stats strong[data-count]').forEach((el) => statObserver.observe(el));
  } else {
    $$('#stats strong[data-count]').forEach((el) => (el.textContent = formatCount(el, Number(el.dataset.count))));
  }

  /* =========================================================
     4. MARQUEE LOGO KLIEN (digandakan biar mulus)
     ========================================================= */
  const track = $('#marquee-track');
  if (track) track.innerHTML += track.innerHTML;

  /* =========================================================
     5. REVEAL SAAT DI-SCROLL
     ========================================================= */
  const revealables = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach((el) => revealObserver.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  /* =========================================================
     6. FORM LEAD (demo — belum terhubung ke backend)
     ========================================================= */
  const leadForm = $('#lead-form');
  const formStatus = $('#form-status');

  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nama = $('#f-nama');
    const email = $('#f-email');
    const wa = $('#f-wa');
    const invalid = [nama, email, wa].filter((f) => !f.value.trim());
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());

    [nama, email, wa].forEach((f) => f.removeAttribute('aria-invalid'));

    if (invalid.length) {
      invalid.forEach((f) => f.setAttribute('aria-invalid', 'true'));
      formStatus.className = 'form-status is-err';
      formStatus.textContent = 'Nama, email, dan nomor WhatsApp wajib diisi ya.';
      invalid[0].focus();
      return;
    }
    if (!emailOk) {
      email.setAttribute('aria-invalid', 'true');
      formStatus.className = 'form-status is-err';
      formStatus.textContent = 'Format email-nya sepertinya belum benar.';
      email.focus();
      return;
    }

    formStatus.className = 'form-status is-ok';
    formStatus.textContent = `Terima kasih, ${nama.value.trim().split(' ')[0]}! Permintaan audit kamu tercatat — tim kami akan menghubungi dalam 1×24 jam kerja.`;
    leadForm.reset();
  });

  /* =========================================================
     7. TAHUN DI FOOTER
     ========================================================= */
  $('#year').textContent = new Date().getFullYear();

  /* =========================================================
     8. CHAT WIDGET — Nara
     ========================================================= */
  const chat = $('#chat');
  const fab = $('#chat-fab');
  const panel = $('#chat-panel');
  const log = $('#chat-log');
  const chips = $('#chat-chips');
  const chatForm = $('#chat-form');
  const input = $('#chat-input');
  const sendBtn = $('#chat-send');
  const teaser = $('#chat-teaser');

  const WELCOME =
    'Halo! Aku **Nara**, asisten Sorotan Digital 👋\n' +
    'Mau tahu layanan mana yang paling pas buat bisnismu? Tanya aja, atau pilih salah satu pertanyaan di bawah.';

  /* ---------- riwayat chat disimpan di localStorage ---------- */
  const STORE_KEY = 'nara-chat-v1';
  const STORE_MAX = 40;       // simpan 40 pesan terakhir saja
  const STORE_TTL = 864e5;    // riwayat hangus setelah 24 jam

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.messages) || Date.now() - data.savedAt > STORE_TTL) {
        forgetHistory();
        return null;
      }
      return data.messages.filter(
        (m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'model')
      );
    } catch (_) {
      forgetHistory(); // localStorage diblokir atau isinya rusak
      return null;
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        savedAt: Date.now(),
        messages: conversation.slice(-STORE_MAX),
      }));
    } catch (_) { /* mode privat / kuota penuh: abaikan saja */ }
  }

  function forgetHistory() {
    try { localStorage.removeItem(STORE_KEY); } catch (_) { /* diabaikan */ }
  }

  // Riwayat yang dikirim ke /api/chat
  const saved = loadHistory();
  const conversation = saved && saved.length ? saved : [{ role: 'model', text: WELCOME }];
  let busy = false;
  let opened = false;

  function renderHistory() {
    log.innerHTML = '';
    conversation.forEach((m) => appendMessage(m.role === 'user' ? 'user' : 'bot', m.text));
    // chip pertanyaan cepat hanya relevan kalau percakapan belum dimulai
    chips.hidden = conversation.some((m) => m.role === 'user');
  }

  function resetChat() {
    if (busy) return;
    forgetHistory();
    conversation.length = 0;
    conversation.push({ role: 'model', text: WELCOME });
    renderHistory();
    input.value = '';
    input.style.height = 'auto';
    if (isOpen()) input.focus();
  }

  renderHistory();
  $('#chat-reset').addEventListener('click', resetChat);

  /* ---------- markdown ringan (aman dari HTML injection) ---------- */
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function inlineFormat(str) {
    return str
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  }

  function renderMarkdown(text) {
    const lines = escapeHtml(String(text)).split('\n');
    let html = '';
    let listTag = null;
    let para = [];

    const flushPara = () => {
      if (para.length) { html += '<p>' + inlineFormat(para.join(' ')) + '</p>'; para = []; }
    };
    const flushList = () => {
      if (listTag) { html += '</' + listTag + '>'; listTag = null; }
    };

    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) { flushPara(); flushList(); return; }

      const bullet = line.match(/^[-*•]\s+(.*)$/);
      const numbered = line.match(/^\d+[.)]\s+(.*)$/);

      if (bullet || numbered) {
        flushPara();
        const tag = bullet ? 'ul' : 'ol';
        if (listTag !== tag) { flushList(); html += '<' + tag + '>'; listTag = tag; }
        html += '<li>' + inlineFormat((bullet || numbered)[1]) + '</li>';
      } else {
        flushList();
        para.push(line);
      }
    });

    flushPara();
    flushList();
    return html;
  }

  /* ---------- render pesan ---------- */
  function appendMessage(who, text) {
    const el = document.createElement('div');
    el.className = 'msg msg--' + (who === 'user' ? 'user' : 'bot');
    if (who === 'user') {
      el.textContent = text;
    } else {
      el.innerHTML = renderMarkdown(text);
    }
    log.appendChild(el);
    scrollLog();
    return el;
  }

  function appendError(message, onRetry) {
    const el = document.createElement('div');
    el.className = 'msg msg--err';
    el.textContent = message;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'msg__retry';
    retry.textContent = 'Coba kirim ulang';
    retry.addEventListener('click', () => { el.remove(); onRetry(); });
    el.appendChild(retry);
    log.appendChild(el);
    scrollLog();
    return el;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'msg msg--bot';
    el.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    log.appendChild(el);
    scrollLog();
    return el;
  }

  function scrollLog() {
    log.scrollTop = log.scrollHeight;
  }

  function setBusy(state) {
    busy = state;
    sendBtn.disabled = state;
    input.disabled = state;
  }

  /* ---------- kirim ke /api/chat ---------- */
  async function ask(text, showBubble) {
    if (busy) return;
    if (showBubble !== false) appendMessage('user', text);

    conversation.push({ role: 'user', text });
    saveHistory();
    chips.hidden = true;
    setBusy(true);
    const typing = showTyping();

    try {
      const res = await fetch(API_BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Server membalas ${res.status}.`);
      if (!data.result) throw new Error('Balasan kosong dari server.');

      typing.remove();
      appendMessage('bot', data.result);
      conversation.push({ role: 'model', text: data.result });
      saveHistory();
    } catch (err) {
      typing.remove();
      conversation.pop(); // buang pesan gagal supaya retry tidak dobel
      saveHistory();
      const offline = !navigator.onLine || err instanceof TypeError;
      appendError(
        offline
          ? 'Nara tidak bisa dihubungi. Pastikan server di localhost:3000 sedang berjalan.'
          : 'Maaf, ada kendala: ' + err.message,
        () => ask(text, false)
      );
    } finally {
      setBusy(false);
      if (isOpen()) input.focus();
    }
  }

  /* ---------- buka / tutup ---------- */
  const isOpen = () => chat.classList.contains('is-open');

  function openChat() {
    chat.classList.add('is-open');
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', 'Tutup chat dengan Nara');
    hideTeaser();
    opened = true;
    setTimeout(() => { input.focus(); scrollLog(); }, 60);
  }

  function closeChat() {
    chat.classList.remove('is-open');
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', 'Buka chat dengan Nara');
    fab.focus();
  }

  fab.addEventListener('click', () => (isOpen() ? closeChat() : openChat()));
  $('#chat-close').addEventListener('click', closeChat);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeChat();
  });

  $$('[data-open-chat]').forEach((btn) => btn.addEventListener('click', openChat));

  /* ---------- input ---------- */
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    input.style.height = 'auto';
    ask(text);
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 108) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });

  chips.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' || busy) return;
    ask(e.target.textContent.trim());
  });

  /* ---------- teaser bubble ---------- */
  function hideTeaser() {
    teaser.hidden = true;
    try { sessionStorage.setItem('nara-teaser', 'off'); } catch (_) { /* diabaikan */ }
  }

  $('#chat-teaser-close').addEventListener('click', (e) => {
    e.stopPropagation();
    hideTeaser();
  });

  teaser.addEventListener('click', openChat);

  let teaserSeen = false;
  try { teaserSeen = sessionStorage.getItem('nara-teaser') === 'off'; } catch (_) { /* diabaikan */ }

  if (!teaserSeen) {
    setTimeout(() => {
      if (!opened && !isOpen()) teaser.hidden = false;
    }, 5000);
  }
})();
