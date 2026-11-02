/* Kansas Union Level 1: the map, the space sheets and the story. No framework, no build step. */
(() => {
  'use strict';
  const D = window.UNION;
  const A = window.UNION_ASSETS;
  const F = A.frame;                       // where the plan image sits on the deck sheet
  const W = F.size[0], H = F.size[1];      // map image size in px
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mq = window.matchMedia('(max-width: 760px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isPhone = () => mq.matches;

  // deck page points -> map px
  const P = ([x, y]) => [x * F.scale - F.box[0], y * F.scale - F.box[1]];
  const SPACES = D.spaces;
  const byId = id => SPACES.find(s => s.id === id);
  const idx = id => SPACES.findIndex(s => s.id === id);
  const zoneOf = n => D.zones.find(z => z.n === n);
  const pad2 = n => String(n).padStart(2, '0');
  const light = hex => { const v = parseInt(hex.slice(1), 16); return ((v >> 16) * 299 + ((v >> 8) & 255) * 587 + (v & 255) * 114) / 1000 > 160; };

  $('#metaTeam').textContent = D.meta.team;
  $('#metaDate').textContent = D.meta.date;

  /* ============================================================ pan and zoom */
  class PanZoom {
    constructor(view, world, { w, h, onChange, inset, maxZoom = 8 }) {
      Object.assign(this, { view, world, w, h, onChange, inset, maxZoom });
      this.t = { x: 0, y: 0, s: 1 };
      this.ptrs = new Map();
      this.anim = 0;
      this.dragged = false;
      this.lastTap = null;
      view.addEventListener('pointerdown', e => this.down(e));
      view.addEventListener('pointermove', e => this.move(e));
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => view.addEventListener(t, e => this.up(e)));
      view.addEventListener('wheel', e => this.wheel(e), { passive: false });
      view.addEventListener('dblclick', e => { if (e.target.closest('button')) return; this.zoomAt(e.clientX, e.clientY, this.t.s * 2, true); });
    }
    rect() { return this.view.getBoundingClientRect(); }
    safe() { // area not covered by floating UI, in view coordinates
      const r = this.rect(), i = this.inset ? this.inset() : { t: 0, r: 0, b: 0, l: 0 };
      return { x: i.l, y: i.t, w: Math.max(80, r.width - i.l - i.r), h: Math.max(80, r.height - i.t - i.b) };
    }
    fitScale() { const a = this.safe(); return Math.min(a.w / this.w, a.h / this.h); }
    apply() {
      const { x, y, s } = this.t;
      this.world.style.transform = `translate3d(${x}px,${y}px,0) scale(${s})`;
      this.onChange && this.onChange(this.t);
    }
    clamp(t) {
      const fs = this.fitScale();
      t.s = Math.min(Math.max(t.s, fs * 0.8), fs * this.maxZoom);
      const r = this.rect(), mw = this.w * t.s, mh = this.h * t.s, m = 60;
      t.x = Math.min(Math.max(t.x, m - mw), r.width - m);
      t.y = Math.min(Math.max(t.y, m - mh), r.height - m);
      return t;
    }
    set(t) { this.t = this.clamp({ ...t }); this.apply(); }
    fitT() {
      const a = this.safe(), s = this.fitScale() * 0.96;
      return { s, x: a.x + (a.w - this.w * s) / 2, y: a.y + (a.h - this.h * s) / 2 };
    }
    fit(animate = true) { this.go(this.fitT(), animate); }
    centerT(px, py, s) {
      const a = this.safe();
      return { s, x: a.x + a.w / 2 - px * s, y: a.y + a.h / 2 - py * s };
    }
    go(target, animate = true) {
      cancelAnimationFrame(this.anim);
      target = this.clamp({ ...target });
      if (!animate || reduce.matches) { this.t = target; this.apply(); return; }
      const from = { ...this.t }, t0 = performance.now(), dur = 650;
      const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const step = now => {
        const k = ease(Math.min(1, (now - t0) / dur));
        const s = from.s * Math.pow(target.s / from.s, k);
        // keep the motion straight in screen space while the scale changes
        this.t = { s, x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k };
        this.apply();
        if (k < 1) this.anim = requestAnimationFrame(step);
      };
      this.anim = requestAnimationFrame(step);
    }
    zoomAt(cx, cy, s, animate = false) {
      const r = this.rect(), px = cx - r.left, py = cy - r.top;
      const fs = this.fitScale();
      s = Math.min(Math.max(s, fs * 0.8), fs * this.maxZoom);
      const k = s / this.t.s;
      const t = { s, x: px - (px - this.t.x) * k, y: py - (py - this.t.y) * k };
      animate ? this.go(t) : this.set(t);
    }
    zoomBy(f) { const r = this.rect(), a = this.safe(); this.zoomAt(r.left + a.x + a.w / 2, r.top + a.y + a.h / 2, this.t.s * f, true); }
    down(e) {
      if (e.button !== undefined && e.button > 0) return;
      cancelAnimationFrame(this.anim);
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
      if (this.ptrs.size === 1) { this.dragged = false; this.start = { ...this.t }; }
      if (this.ptrs.size === 2) this.pinch0 = { ...this.pinchInfo(), t: { ...this.t } };
    }
    pinchInfo() {
      const [a, b] = [...this.ptrs.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
    move(e) {
      const p = this.ptrs.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX; p.y = e.clientY;
      if (this.ptrs.size === 1) {
        const dx = p.x - p.x0, dy = p.y - p.y0;
        if (!this.dragged && Math.hypot(dx, dy) > 6) {
          this.dragged = true;
          this.view.classList.add('dragging');
          try { this.view.setPointerCapture(e.pointerId); } catch (_) {}
        }
        if (this.dragged) this.set({ s: this.start.s, x: this.start.x + dx, y: this.start.y + dy });
      } else if (this.ptrs.size === 2 && this.pinch0) {
        this.dragged = true;
        const now = this.pinchInfo(), r = this.rect(), p0 = this.pinch0;
        const s = p0.t.s * now.d / p0.d;
        const fs = this.fitScale(), sc = Math.min(Math.max(s, fs * 0.8), fs * this.maxZoom), k = sc / p0.t.s;
        const ox = p0.cx - r.left, oy = p0.cy - r.top;
        this.set({ s: sc, x: now.cx - r.left - (ox - p0.t.x) * k, y: now.cy - r.top - (oy - p0.t.y) * k });
      }
    }
    up(e) {
      if (!this.ptrs.has(e.pointerId)) return;
      const p = this.ptrs.get(e.pointerId);
      this.ptrs.delete(e.pointerId);
      if (this.ptrs.size < 2) this.pinch0 = null;
      if (this.ptrs.size === 1) { const q = [...this.ptrs.values()][0]; q.x0 = q.x; q.y0 = q.y; this.start = { ...this.t }; }
      if (this.ptrs.size === 0) {
        this.view.classList.remove('dragging');
        if (e.type === 'pointerup' && !this.dragged && e.pointerType !== 'mouse' && !e.target.closest('button')) {
          const now = performance.now();
          if (this.lastTap && now - this.lastTap.t < 320 && Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 30) {
            this.zoomAt(p.x, p.y, this.t.s * 2, true); this.lastTap = null;
          } else this.lastTap = { t: now, x: p.x, y: p.y };
        }
        if (this.dragged) setTimeout(() => { this.dragged = false; }, 0);
      }
    }
    wheel(e) {
      e.preventDefault();
      cancelAnimationFrame(this.anim);
      const mouseWheel = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || e.metaKey || mouseWheel) {
        const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022));
        this.zoomAt(e.clientX, e.clientY, this.t.s * f);
      } else {
        this.set({ ...this.t, x: this.t.x - e.deltaX, y: this.t.y - e.deltaY });
      }
    }
  }

  /* ============================================================ map */
  const view = $('#viewport'), world = $('#world'), marks = $('#marks'), mapView = $('#mapView');
  const sheet = $('#sheet'), body = $('#sheetBody'), scroller = $('#sheetScroll');
  // focus moving into the sheet must never scroll the map container itself
  mapView.addEventListener('scroll', () => { mapView.scrollTop = 0; mapView.scrollLeft = 0; });
  view.addEventListener('scroll', () => { view.scrollTop = 0; view.scrollLeft = 0; });
  world.style.width = W + 'px';
  world.style.height = H + 'px';

  const layerImgs = Object.fromEntries($$('.layer', world).map(i => [i.dataset.layer, i]));
  const layerState = {};
  function loadLayer(name, big) {
    const st = layerState[name] || (layerState[name] = {});
    const want = big ? 'big' : 'small';
    if (st.level === 'big' || st.level === want) return;
    const src = `assets/map/${name}${big ? '' : '-sm'}.webp`;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { layerImgs[name].src = src; st.level = want; };
    img.src = src;
  }
  let layer = 'plan';
  function setLayer(name) {
    layer = name;
    for (const [k, img] of Object.entries(layerImgs)) img.classList.toggle('on', k === name);
    $$('.layers button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.layer === name)));
    mapView.classList.toggle('show-zones', name === 'zones');
    mapView.classList.toggle('show-heat', name === 'heat');
    loadLayer(name, pz && pz.t.s > pz.fitScale() * 1.5);
  }
  $$('.layers button').forEach(b => b.addEventListener('click', () => setLayer(b.dataset.layer)));
  loadLayer('plan', false);

  // view cones: the deck's red wedge, drawn on the plan
  const cones = $('#cones');
  cones.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const NS = 'http://www.w3.org/2000/svg';
  for (const s of SPACES) {
    const [cx, cy] = P(s.cam), [lx, ly] = P(s.look);
    const ang = Math.atan2(ly - cy, lx - cx), half = 0.42, len = Math.max(Math.hypot(lx - cx, ly - cy) * 1.1, 300);
    const a1 = [cx + Math.cos(ang - half) * len, cy + Math.sin(ang - half) * len];
    const a2 = [cx + Math.cos(ang + half) * len, cy + Math.sin(ang + half) * len];
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M${cx},${cy} L${a1} A${len},${len} 0 0 1 ${a2} Z`);
    path.setAttribute('class', 'cone');
    path.dataset.id = s.id;
    cones.appendChild(path);
  }

  // pins, zone labels, entrance
  const pins = {}, overlays = [];
  for (const s of SPACES) {
    const b = document.createElement('button');
    b.className = 'pin';
    b.type = 'button';
    b.innerHTML = `${s.id}<span class="tip">${esc(s.title)}</span>`;
    b.setAttribute('aria-label', `${s.id}, ${s.title}`);
    b.addEventListener('click', () => { if (!pz.dragged) go(`#/space/${s.id}`); });
    const cone = () => cones.querySelector(`[data-id="${s.id}"]`);
    b.addEventListener('pointerenter', () => cone().classList.add('hover'));
    b.addEventListener('pointerleave', () => cone().classList.remove('hover'));
    marks.appendChild(b);
    pins[s.id] = b;
    overlays.push([b, P(s.cam)]);
  }
  for (const z of D.zones) {
    const el = document.createElement('div');
    el.className = 'zlabel' + (z.hot ? ' hot' : '');
    el.innerHTML = `<b>${z.n}</b><span>${esc(z.name)}</span>`;
    marks.appendChild(el);
    overlays.push([el, P(z.at)]);
  }
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `<svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true"><path d="M11 0 L22 13 H15 V26 H7 V13 H0 Z" fill="currentColor"/></svg><span>Entrance</span>`;
  marks.appendChild(entry);
  overlays.push([entry, P(D.entrance)]);

  // the plan's own scale bar (293 pt = 50 ft on the zones sheet) gets its label back
  const ft = document.createElement('div');
  ft.className = 'ftlabel';
  ft.textContent = '50 ft';
  marks.appendChild(ft);
  overlays.push([ft, P(D.scaleLabel)]);

  function placeMarks(t) {
    for (const [el, [x, y]] of overlays) el.style.transform = `translate3d(${t.x + x * t.s}px,${t.y + y * t.s}px,0)` + (el.classList.contains('entry') ? ' translateX(-50%)' : el.classList.contains('zlabel') ? ' translate(-13px,-13px)' : el.classList.contains('ftlabel') ? ' translate(-100%,-100%)' : '');
    if (t.s > pz.fitScale() * 1.5) loadLayer(layer, true);
  }

  function mapInset() {
    if (isPhone()) {
      const h = sheetVisible();
      return { t: 64, r: 12, b: h + 12, l: 12 };
    }
    return { t: 70, r: 70, b: 40, l: 24 };
  }
  const pz = new PanZoom(view, world, { w: W, h: H, onChange: placeMarks, inset: mapInset, maxZoom: 7 });

  $('#zoomIn').addEventListener('click', () => pz.zoomBy(1.6));
  $('#zoomOut').addEventListener('click', () => pz.zoomBy(1 / 1.6));
  $('#zoomFit').addEventListener('click', () => pz.fit());

  function focusSpace(id, animate = true) {
    const s = byId(id);
    const [cx, cy] = P(s.cam), [lx, ly] = P(s.look);
    const fs = pz.fitScale();
    const target = Math.max(pz.t.s, fs * (isPhone() ? 1.7 : 1.5));
    pz.go(pz.centerT((cx * 2 + lx) / 3, (cy * 2 + ly) / 3, Math.min(target, fs * 2)), animate);
  }

  function highlight(id, zone) {
    for (const s of SPACES) {
      const on = s.id === id || (!!zone && s.zone === zone);
      const dim = !on && (!!id || !!zone);
      pins[s.id].classList.toggle('on', on);
      pins[s.id].classList.toggle('dim', dim);
      const c = cones.querySelector(`[data-id="${s.id}"]`);
      c.classList.toggle('on', on);
      c.classList.toggle('dim', dim);
    }
  }

  /* ============================================================ the sheet (bottom sheet on phones) */
  let sheetState = 'peek';
  function sheetVisible() {
    const h = mapView.clientHeight;
    if (sheetState === 'full') return h;
    if (sheetState === 'half') return h * 0.52;
    return peekPx();
  }
  function peekPx() {
    const end = body.querySelector('[data-peek-end]');
    const grip = 26;
    const v = end ? end.offsetTop + end.offsetHeight + grip + 14 : 150;
    return Math.min(Math.max(v, 120), mapView.clientHeight * 0.45);
  }
  function setSheet(state, refocus = true) {
    sheetState = state;
    sheet.classList.toggle('half', state === 'half');
    sheet.classList.toggle('full', state === 'full');
    const pk = peekPx() + 'px';
    sheet.style.setProperty('--peek', pk);
    mapView.style.setProperty('--peek', state === 'peek' ? pk : (state === 'half' ? '52%' : '0px'));
    if (state === 'peek') scroller.scrollTop = 0;
    if (refocus && isPhone() && state !== 'full') {
      if (route.space) focusSpace(route.space); else pz.fit();
    }
  }
  // grip: tap to cycle, drag to choose
  (() => {
    const grip = $('#grip');
    let y0 = null, startT = 0, moved = false;
    const base = () => {
      const h = sheet.offsetHeight;
      return sheetState === 'full' ? 0 : sheetState === 'half' ? h * 0.48 : h - peekPx();
    };
    grip.addEventListener('pointerdown', e => { y0 = e.clientY; startT = base(); moved = false; grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointermove', e => {
      if (y0 === null) return;
      const dy = e.clientY - y0;
      if (Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      sheet.classList.add('dragging');
      sheet.style.transform = `translateY(${Math.max(0, startT + dy)}px)`;
    });
    const end = e => {
      if (y0 === null) return;
      const dy = e.clientY - y0;
      y0 = null;
      sheet.classList.remove('dragging');
      sheet.style.transform = '';
      if (!moved) { setSheet(sheetState === 'peek' ? 'half' : sheetState === 'half' ? 'full' : 'peek'); return; }
      const h = sheet.offsetHeight, pos = startT + dy;
      const stops = [['full', 0], ['half', h * 0.48], ['peek', h - peekPx()]];
      stops.sort((a, b) => Math.abs(a[1] - pos) - Math.abs(b[1] - pos));
      setSheet(stops[0][0]);
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  })();
  // on a phone, reading on past the half sheet opens it the rest of the way
  scroller.addEventListener('scroll', () => {
    if (isPhone() && sheetState === 'half' && scroller.scrollTop > 12) setSheet('full', false);
  }, { passive: true });
  // on a phone, tapping the collapsed sheet opens it
  sheet.addEventListener('click', e => {
    if (isPhone() && sheetState === 'peek' && !e.target.closest('button, a, input')) setSheet('half');
  });

  /* ============================================================ sheet content */
  const img = (src, alt, cls = '') => `<img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async" class="${cls}">`;
  const malikStep = id => D.persona.day.findIndex(d => d.space === id);

  function overviewHTML() {
    const m = D.meta;
    return `<div class="intro">
      <p class="label blue">${esc(m.status)} · ${esc(m.team)}</p>
      <h1 class="display">${esc(m.title)}</h1>
      <p class="rooms">${esc(m.rooms)}</p>
      <div class="ctas" data-peek-end>
        <button class="btn primary" data-go="#/space/01">Walk the floor <small>${SPACES.length} spaces</small></button>
        <button class="btn ghost" data-go="#/space/${D.persona.day[0].space}?malik=0">Follow Malik’s day <small>11 AM to 8 PM</small></button>
      </div>
      <p class="lede">A walk through the first floor. Tap a number on the plan, or walk all ${SPACES.length} spaces in order, each with a before and after.</p>
    </div>
    <div class="sec-head"><h2 class="display">The spaces</h2><span class="label muted">In walking order</span></div>
    <ul class="rows">${SPACES.map(s => `<li><button class="row" data-go="#/space/${s.id}" data-hl="${s.id}">
      <span class="num">${s.id}</span><span><span class="t">${esc(s.title)}</span><span class="s">${esc(s.zoneLabel)}</span></span><span class="arr" aria-hidden="true">→</span>
    </button></li>`).join('')}</ul>
    <div class="sec-head"><h2 class="display">Nine zones</h2><button class="back" data-layer-go="zones">Show on plan →</button></div>
    <ul class="rows">${D.zones.map(z => `<li><button class="row" data-zone="${z.n}">
      <span class="z${z.hot ? ' hot' : ''}">${z.n}</span><span><span class="t">${esc(z.name)}</span>${z.note ? `<span class="s">${esc(z.note)}</span>` : ''}</span>
      <span class="arr" aria-hidden="true">${SPACES.filter(s => s.zone === z.n).map(s => s.id).join(' ')}</span>
    </button></li>`).join('')}</ul>
    <div class="sec-head"><h2 class="display">How loud</h2><button class="back" data-layer-go="heat">Show on plan →</button></div>
    <div class="card"><ul class="loud">${loudRows()}</ul></div>
    <div class="ctas"><button class="btn ghost" data-go="#/story">How we got here <small>Survey, persona, intent</small></button></div>`;
  }
  const LOUD_C = ['#D7191C', '#F6C779', '#2F6DAE'];
  const loudRows = () => D.loudness.map(([k, v], i) => `<li><i style="background:${LOUD_C[i]}"></i><strong class="label">${esc(k)}</strong><p>${esc(v)}</p></li>`).join('');

  function spaceHTML(id, malik) {
    const s = byId(id), i = idx(id), a = A.spaces[id] || {};
    const prev = SPACES[i - 1], next = SPACES[i + 1];
    const touring = malik !== null && malik !== undefined;
    const step = touring ? D.persona.day[malik] : null;
    const prevHref = touring ? (malik > 0 ? `#/space/${D.persona.day[malik - 1].space}?malik=${malik - 1}` : '') : (prev ? `#/space/${prev.id}` : '');
    const nextHref = touring ? (malik < D.persona.day.length - 1 ? `#/space/${D.persona.day[malik + 1].space}?malik=${malik + 1}` : '') : (next ? `#/space/${next.id}` : '');
    const prevT = touring ? (malik > 0 ? D.persona.day[malik - 1].time : '') : prev && prev.title;
    const nextT = touring ? (malik < D.persona.day.length - 1 ? D.persona.day[malik + 1].time : '') : next && next.title;
    const ms = malikStep(id);
    const rev = s.revenue !== undefined ? D.revenue[s.revenue] : null;
    const counter = touring ? `${malik + 1} / ${D.persona.day.length}` : `${s.id} / ${pad2(SPACES.length)}`;

    return `
    <div class="topnav">
      <button class="back" data-go="#/">← ${touring ? 'End Malik’s day' : 'All spaces'}</button>
      <div class="stepper">
        <button class="icon-btn" aria-label="Previous" ${prevHref ? `data-go="${prevHref}"` : 'disabled'}>←</button>
        <span>${counter}</span>
        <button class="icon-btn" aria-label="Next" ${nextHref ? `data-go="${nextHref}"` : 'disabled'}>→</button>
      </div>
    </div>
    ${touring ? `<div class="tour"><span class="time">${esc(step.time)}</span><span class="label">Malik’s day</span><p>${esc(step.what)}</p></div>` : ''}
    <div class="space-head" ${touring ? '' : ''}>
      <div><p class="label blue">${esc(s.zoneLabel)}</p><h2 class="display" data-peek-end>${esc(s.title)}</h2></div>
      <span class="big" aria-hidden="true">${s.id}</span>
    </div>
    <div class="stack" style="margin-top:18px">
      ${a.after ? `<div>
        <div class="compare" style="--cut:50%" data-compare>
          ${img(a.before, `${s.title}, before`, 'before')}
          ${img(a.after, `${s.title}, after`, 'after')}
          <span class="tag b">Before</span><span class="tag a">After</span>
          <div class="handle"><b>◀ ▶</b></div>
          <input type="range" min="0" max="100" value="50" aria-label="Before and after: drag to compare" style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px">
          <button class="expand" data-lb="${a.after}" data-cap="${esc(s.id + ' · ' + s.title)}" aria-label="Open the render full screen">
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5" fill="none" stroke="#142E54" stroke-width="2"/></svg></button>
        </div>
        <p class="hint">Drag across the picture to compare today with the plan.</p>
      </div>` : ''}
      <div class="problem"><p class="label red">The problem</p><h3 class="display">${esc(s.problem)}</h3></div>
      ${ms >= 0 && !touring ? `<a class="chip-card malik" href="#/space/${id}?malik=${ms}"><span class="label red">Malik, ${esc(D.persona.day[ms].time)}</span><p>${esc(D.persona.day[ms].what)}</p></a>` : ''}
      ${rev ? `<div class="chip-card money"><span class="label blue">Who pays for it</span><strong>${esc(rev[0])}</strong><p>${esc(rev[1])}</p></div>` : ''}
      ${a.views ? `<div><p class="label muted" style="margin-bottom:8px">More views</p><div class="views">${a.views.map((v, k) => `<button data-lb="${v}" data-cap="${esc(s.title)} · view ${k + 1}">${img(v, `${s.title}, view ${k + 1}`)}</button>`).join('')}</div></div>` : ''}
      ${a.art ? `<div><p class="label muted" style="margin-bottom:8px">The graphic</p><div class="art">${a.art.map((v, k) => `<button data-lb="${v}" data-cap="${esc(s.title)} · graphic">${img(v, `${s.title} graphic ${k + 1}`)}</button>`).join('')}</div></div>` : ''}
      ${a.elevation ? `<div class="elev">
        <p class="label blue">Elevation · scale 1/2″ = 1′-0″</p>
        <button data-lb="${a.elevation}" data-cap="${esc(s.title)} · elevation" aria-label="Open the elevation full screen">${img(a.elevation, `${s.title} elevation drawing`)}</button>
        <p class="hint">Tap the drawing to zoom in.</p>
      </div>` : ''}
      ${s.build ? `<div class="card"><p class="label muted">How it’s built</p>${s.size ? `<p class="size" style="margin-top:8px">${esc(s.size)}</p>` : ''}
        <ol class="build" style="margin-top:12px">${s.build.map(([t, d]) => `<li><strong>${esc(t)}</strong><p>${esc(d)}</p></li>`).join('')}</ol>
        ${s.notes ? `<p class="notes">${esc(s.notes)}</p>` : ''}</div>` : ''}
    </div>
    <div class="pager">
      <button ${prevHref ? `data-go="${prevHref}"` : 'disabled'}><span class="label muted">Previous</span><b>${esc(prevT || '')}</b></button>
      <button class="next" ${nextHref ? `data-go="${nextHref}"` : 'data-go="#/"'}><span class="label">${nextHref ? 'Next' : 'Done'}</span><b>${esc(nextT || 'Back to the plan')}</b></button>
    </div>`;
  }

  function wireCompare(root) {
    for (const c of $$('[data-compare]', root)) {
      const range = $('input', c);
      const setCut = v => { v = Math.min(100, Math.max(0, v)); c.style.setProperty('--cut', v + '%'); range.value = v; };
      let active = false, x0 = 0, y0 = 0, decided = false;
      c.addEventListener('pointerdown', e => {
        if (e.target.closest('.expand')) return;
        active = true; decided = e.pointerType === 'mouse'; x0 = e.clientX; y0 = e.clientY;
        if (decided) { c.setPointerCapture(e.pointerId); move(e); }
      });
      const move = e => {
        if (!active) return;
        if (!decided) {
          const dx = Math.abs(e.clientX - x0), dy = Math.abs(e.clientY - y0);
          if (dx < 6 && dy < 6) return;
          if (dy > dx) { active = false; return; }   // vertical: let the sheet scroll
          decided = true; c.setPointerCapture(e.pointerId);
        }
        const r = c.getBoundingClientRect();
        setCut((e.clientX - r.left) / r.width * 100);
      };
      c.addEventListener('pointermove', move);
      const stop = e => {
        if (active && !decided && e.type === 'pointerup') { const r = c.getBoundingClientRect(); setCut((e.clientX - r.left) / r.width * 100); }
        active = false;
      };
      c.addEventListener('pointerup', stop);
      c.addEventListener('pointercancel', () => { active = false; });
      range.addEventListener('input', () => setCut(+range.value));
      c.tabIndex = 0;
      c.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); setCut(+range.value + (e.key === 'ArrowLeft' ? -5 : 5)); }
      });
    }
  }

  // one delegated handler for the whole page
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); go(g.dataset.go); return; }
    const lb = e.target.closest('[data-lb]');
    if (lb) { e.preventDefault(); openLightbox(lb.dataset.lb, lb.dataset.cap || ''); return; }
    const lg = e.target.closest('[data-layer-go]');
    if (lg) { setLayer(lg.dataset.layerGo); if (isPhone()) setSheet('peek', false); pz.fit(); return; }
    const z = e.target.closest('[data-zone]');
    if (z) {
      const n = +z.dataset.zone;
      setLayer('zones'); highlight(null, n);
      $$('[data-zone]').forEach(r => r.classList.toggle('hl', r === z));
      const zz = zoneOf(n), [x, y] = P(zz.at);
      if (isPhone()) setSheet('peek', false);
      pz.go(pz.centerT(x, y, pz.fitScale() * 1.6));
    }
  });
  body.addEventListener('pointerover', e => {
    const r = e.target.closest('[data-hl]');
    if (!route.space) highlight(r ? r.dataset.hl : null);
  });

  /* ============================================================ lightbox */
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbStage = $('#lbStage');
  const lbPz = new PanZoom(lbStage, lbImg, { w: 1, h: 1, maxZoom: 6, inset: () => ({ t: 16, r: 16, b: 16, l: 16 }) });
  let lbReturn = null;
  function openLightbox(src, cap) {
    lbReturn = document.activeElement;
    $('#lbCap').textContent = cap;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lbImg.style.visibility = 'hidden';
    lbImg.onload = () => {
      lbPz.w = lbImg.naturalWidth; lbPz.h = lbImg.naturalHeight;
      lbImg.style.width = lbPz.w + 'px'; lbImg.style.height = lbPz.h + 'px';
      lbPz.fit(false);
      lbImg.style.visibility = '';
    };
    lbImg.src = src;
    lbImg.alt = cap;
    $('#lbClose').focus();
  }
  function closeLightbox() {
    if (lb.hidden) return;
    lb.hidden = true;
    lbImg.removeAttribute('src');
    document.body.style.overflow = '';
    lbReturn && lbReturn.focus && lbReturn.focus();
  }
  $('#lbClose').addEventListener('click', closeLightbox);
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

  /* ============================================================ story */
  const story = $('#storyView');
  function storyHTML() {
    const sv = D.survey, pe = D.persona, m = D.meta;
    const bars = (rows, cls = '') => `<ul class="bars ${cls}">${rows.map(([t, n]) => `<li><div><span>${esc(t)}</span><strong>${n}%</strong></div><i><b style="width:${n}%"></b></i></li>`).join('')}</ul>`;
    const head = (no, label) => `<div class="sb-head"><p class="label muted">${esc(label)}</p><span class="sb-no">${no}</span></div>`;
    const ref = (k) => `assets/refs/${k}.webp`;
    let n = 0; const no = () => pad2(++n);
    return `
    <section class="sheetblock blue" id="top">
      ${head(no(), `${m.place} · ${m.status}`)}
      <h2 class="display">A walk through<br>the first floor.</h2>
      <p class="intent" style="margin-top:28px">${esc(D.intent)}</p>
      <div class="cta-row"><button class="btn ghost" data-go="#/space/01">Walk the floor <small>${SPACES.length} spaces</small></button>
      <button class="btn ghost" data-go="#/">Open the plan <small>Map</small></button></div>
    </section>

    <section class="sheetblock" id="today">
      ${head(no(), 'The floor today')}
      <h2 class="display">Where it starts.</h2>
      <div class="photos" style="margin-top:28px">${[1, 2, 3, 4].map(k => `<button data-lb="${ref('today-' + k)}" data-cap="The floor today">${img(ref('today-' + k), 'The first floor today, photo ' + k)}</button>`).join('')}</div>
    </section>

    <section class="sheetblock" id="heard">
      ${head(no(), `Student survey · ${sv.responses} responses`)}
      <div class="cols">
        <div><div class="lead-stat">${sv.lead.n}%</div><p style="font-size:20px;margin:12px 0 0">${esc(sv.lead.text)}</p></div>
        <div class="cols" style="--n:2;gap:24px">
          <div><p class="label blue">What would make you stay</p>${bars(sv.stay)}</div>
          <div><p class="label red">What gets in the way</p>${bars(sv.block, 'red')}</div>
        </div>
      </div>
      <div class="stats">${sv.stats.map(([v, t]) => `<div>${v}%<p>${esc(t)}</p></div>`).join('')}</div>
      <div class="cta-row"><button class="btn primary" data-go="#/survey">See every answer <small>All ${sv.responses} responses</small></button></div>
    </section>

    <section class="sheetblock" id="malik">
      ${head(no(), 'User persona · built from the survey')}
      <div class="cols">
        <div><h2 class="display">${esc(pe.name)}</h2><p style="margin:12px 0 0;font-weight:600">${esc(pe.who)}</p>
          <p class="quote">“${esc(pe.quote)}”</p>
          <p class="label muted" style="margin-top:28px">What he needs</p>
          <ul class="needs" style="margin-top:8px">${pe.needs.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <div><p class="label muted">A typical day, on the plan</p>
          <ul class="day" style="margin-top:8px">${pe.day.map((d, k) => `<li><button data-go="#/space/${d.space}?malik=${k}">
            <span class="time">${esc(d.time)}</span><span>${esc(d.what)}</span><span class="go">${esc(byId(d.space).title)} →</span></button></li>`).join('')}</ul>
          <div class="cta-row"><button class="btn primary" data-go="#/space/${pe.day[0].space}?malik=0">Follow his day on the map <small>4 stops</small></button></div>
        </div>
      </div>
    </section>

    <section class="sheetblock" id="place">
      ${head(no(), 'The place, and what is at stake')}
      <h2 class="display">${esc(D.vision)}</h2>
      <ol class="principles">${D.principles.map(([t, d, ans], k) => `<li><span class="n">${k + 1}</span><strong>${esc(t)}</strong><p>${esc(d)}</p><p class="ans">${esc(ans)}</p></li>`).join('')}</ol>
    </section>

    <section class="sheetblock" id="changed">
      ${head(no(), 'Design')}
      <h2 class="display">What changed</h2>
      <div class="changed" style="margin-top:28px">
        <figure><figcaption><p class="label muted">Today</p></figcaption><button data-lb="assets/changed/today.webp" data-cap="Today">${img('assets/changed/today.webp', 'Level 1 plan today')}</button></figure>
        <figure><figcaption><p class="label blue">Our plan · nine zones</p></figcaption><button data-lb="assets/changed/ours.webp" data-cap="Our plan">${img('assets/changed/ours.webp', 'Level 1 plan with the nine zones')}</button></figure>
      </div>
      <div class="cta-row"><button class="btn ghost" data-go="#/?layer=zones">Explore the zones <small>Map</small></button></div>
    </section>

    <section class="sheetblock" id="loud">
      ${head(no(), 'Design')}
      <div class="cols"><h2 class="display">Loud<br>to quiet</h2>
        <div><ul class="loud">${loudRows()}</ul>
        <div class="cta-row"><button class="btn primary" data-go="#/?layer=heat">See it on the plan <small>Map</small></button></div></div></div>
    </section>

    <section class="sheetblock" id="feel">
      ${head(no(), 'Mood references')}
      <h2 class="display">The feel</h2>
      <div class="grid-imgs" style="--n:4;margin-top:28px">${D.feel.map(([k, t, f]) => `<figure><button data-lb="${ref(k)}" data-cap="${esc(t)}">${img(ref(k), t)}</button>
        <figcaption><span class="label blue">Informs ${esc(f)}</span>${esc(t)}</figcaption></figure>`).join('')}</div>
    </section>

    <section class="sheetblock" id="sit">
      ${head(no(), 'Furniture references')}
      <h2 class="display">Sit down</h2>
      <div class="grid-imgs contain" style="--n:3;margin-top:28px">${D.furniture.map(([k, b, t]) => `<figure><button data-lb="${ref(k)}" data-cap="${esc(b + ' · ' + t)}">${img(ref(k), b + ' ' + t)}</button>
        <figcaption><span class="label muted">${esc(b)}</span>${esc(t)}</figcaption></figure>`).join('')}</div>
    </section>

    <section class="sheetblock" id="materials">
      ${head(no(), 'Finishes · color')}
      <div class="cols" style="align-items:end"><h2 class="display">Materials</h2><p style="font-size:18px;margin:0">${esc(D.paletteNote)}</p></div>
      <div class="swatches">${D.palette.map(([t, c]) => `<div style="background:${c};color:${light(c) ? 'var(--ink)' : '#fff'}">${esc(t)}</div>`).join('')}</div>
      <div class="grid-imgs" style="--n:7;margin-top:12px">${D.materials.map(([k, t, w]) => `<figure><button data-lb="${ref(k)}" data-cap="${esc(t)}">${img(ref(k), t)}</button>
        <figcaption><span class="label muted">${esc(w)}</span>${esc(t)}</figcaption></figure>`).join('')}</div>
    </section>

    <section class="sheetblock" id="pays">
      ${head(no(), m.place)}
      <div class="cols" style="--n:1"><h2 class="display">Who pays<br>for it.</h2><p style="font-size:18px;margin:0">Three new revenue streams, each built into a space on the walk.</p></div>
      <div class="pays" style="margin-top:28px">${D.revenue.map(([t, d, sid], k) => `<button data-go="#/space/${sid}">
        ${(A.spaces[sid] || {}).after ? img(A.spaces[sid].after, byId(sid).title) : ''}
        <div class="body"><span class="n">${pad2(k + 1)}</span><h3 class="display">${esc(t)}</h3><p>${esc(d)}</p><p class="go">${esc(sid + ' · ' + byId(sid).title)} on the map →</p></div></button>`).join('')}</div>
    </section>

    <footer class="foot"><span>${esc(m.place)} · ${esc(m.rooms)}</span><span>${esc(m.team)} · ${esc(m.date)} · ${esc(m.courses)}</span></footer>`;
  }

  /* ============================================================ survey: every answer */
  function surveyHTML() {
    const S = window.UNION_SURVEY, n = S.n;
    const pct = v => Math.round(v / n * 100);
    const block = q => {
      const rows = S[q.key];
      if (q.key === 'energy') {
        const max = Math.max(...rows.map(r => r[1]));
        return `<div class="energy">${rows.map(([k, v]) => `<div><span class="e-n">${pct(v)}%</span><i style="height:${Math.max(4, v / max * 100)}%"></i><b>${esc(k)}</b><small>${v}</small></div>`).join('')}</div>
          <div class="e-ends"><span>1 · Calm and quiet</span><span>5 · Loud and lively</span></div>`;
      }
      return `<ul class="bars tally">${rows.map(([t, v]) => `<li><div><span>${esc(t)}</span><strong>${pct(v)}% <small>${v}</small></strong></div><i><b style="width:${pct(v)}%"></b></i></li>`).join('')}</ul>`;
    };
    const card = q => `<article class="qcard"><p class="label muted">${esc(q.how)}</p><h3>${esc(q.q)}</h3>${block(q)}</article>`;
    const said = (title, list) => `<article class="qcard wide"><p class="label red">In their words</p><h3>${esc(title)}</h3>
      <ul class="said">${list.map(t => `<li>“${esc(t)}”</li>`).join('')}</ul></article>`;
    const [first, ...rest] = S.questions;
    return `
    <section class="sheetblock">
      <div class="sb-head"><p class="label muted">Student survey · ${n} responses · ${esc(S.date)}</p><span class="sb-no">Raw</span></div>
      <h2 class="display">Every answer.</h2>
      <p class="survey-note">${esc(S.source)} Percentages are the share of all ${n} people who answered; questions that allow more than one pick add up to more than 100%.</p>
      <div class="cta-row">
        <a class="btn primary" href="assets/survey/KU-Union-Level-1-Survey.csv" download>Download the data <small>CSV</small></a>
        <a class="btn ghost" href="assets/survey/KU-Union-Level-1-Survey-Results.pdf" target="_blank" rel="noopener">The printed report <small>PDF · 4 pages</small></a>
      </div>
    </section>
    <div class="qgrid">
      ${card(first)}
      ${S.questions[1] ? card(S.questions[1]) : ''}
      ${said(S.otherQ, S.pain_other)}
      ${rest.slice(1).map(card).join('')}
      ${said(S.ideaQ, S.ideas)}
    </div>
    <div class="cta-row" style="justify-content:center;margin:8px 0 24px"><button class="btn ghost" data-go="#/story/heard">Back to what we heard <small>Our thinking</small></button></div>
    <footer class="foot"><span>${esc(D.meta.place)} · ${esc(D.meta.rooms)}</span><span>${esc(D.meta.team)} · ${esc(D.meta.courses)}</span></footer>`;
  }

  /* ============================================================ routing */
  let route = {};
  let storyBuilt = false;
  function parse() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, q] = h.split('?');
    const qs = new URLSearchParams(q || '');
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'story') return { view: 'story', anchor: parts[1] || null };
    if (parts[0] === 'survey') return { view: 'survey' };
    if (parts[0] === 'space' && byId(parts[1])) {
      const mk = qs.has('malik') ? +qs.get('malik') : null;
      return { view: 'map', space: parts[1], malik: mk !== null && D.persona.day[mk] && D.persona.day[mk].space === parts[1] ? mk : null, layer: qs.get('layer') };
    }
    return { view: 'map', layer: qs.get('layer') };
  }
  function go(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }
  let firstRender = true;
  function render() {
    const prev = route;
    route = parse();
    const tab = route.view === 'survey' ? 'survey' : route.view === 'story' ? (route.anchor === 'pays' ? 'pays' : 'story') : 'map';
    $$('.tabs a').forEach(a => { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });

    if (route.view === 'survey') {
      mapView.hidden = true; story.hidden = false;
      story.innerHTML = surveyHTML(); storyBuilt = false;
      document.title = 'Survey · The First Floor';
      window.scrollTo(0, 0);
      firstRender = false;
      return;
    }
    if (route.view === 'story') {
      mapView.hidden = true; story.hidden = false;
      if (!storyBuilt) { story.innerHTML = storyHTML(); storyBuilt = true; }
      document.title = 'Our thinking · The First Floor';
      const target = route.anchor && document.getElementById(route.anchor);
      const toTarget = smooth => window.scrollTo({ top: target ? target.getBoundingClientRect().top + window.scrollY - 80 : 0, behavior: smooth ? 'smooth' : 'auto' });
      toTarget(!firstRender);
      if (target) { // pictures above the section can still be loading: hold the position until the reader scrolls
        let held = true;
        const release = () => { held = false; };
        ['wheel', 'touchstart', 'keydown'].forEach(t => window.addEventListener(t, release, { once: true, passive: true }));
        [400, 900, 1600].forEach(ms => setTimeout(() => { if (held && route.anchor === target.id) toTarget(false); }, ms));
      }
      firstRender = false;
      return;
    }
    const wasHidden = mapView.hidden;
    story.hidden = true; mapView.hidden = false;
    window.scrollTo(0, 0);
    if (route.layer && layerImgs[route.layer]) setLayer(route.layer);

    if (route.space) {
      const s = byId(route.space);
      document.title = `${s.id} ${s.title} · The First Floor`;
      body.innerHTML = spaceHTML(route.space, route.malik);
      wireCompare(body);
      scroller.scrollTop = 0;
      if (layer === 'zones') setLayer('plan');
      highlight(route.space);
      if (isPhone()) setSheet(sheetState === 'full' ? 'full' : 'half', false);
      focusSpace(route.space, !firstRender && !wasHidden);
    } else {
      document.title = 'The First Floor · Kansas Union Level 1';
      body.innerHTML = overviewHTML();
      scroller.scrollTop = 0;
      highlight(null);
      if (isPhone()) setSheet(route.layer ? 'peek' : (prev.space ? 'peek' : sheetState === 'full' ? 'half' : sheetState), false);
      pz.fit(!firstRender && !wasHidden);
    }
    if (isPhone()) setSheet(sheetState, false);
    firstRender = false;
  }

  window.addEventListener('hashchange', render);
  document.addEventListener('keydown', e => {
    if (!lb.hidden) { if (e.key === 'Escape') closeLightbox(); return; }
    if (route.view !== 'map' || e.target.closest('input, textarea')) return;
    if (route.space && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const btn = $$('.stepper .icon-btn', body)[e.key === 'ArrowLeft' ? 0 : 1];
      if (btn && btn.dataset.go) go(btn.dataset.go);
    }
    if (e.key === 'Escape' && route.space) go('#/');
    if (e.key === '+' || e.key === '=') pz.zoomBy(1.4);
    if (e.key === '-') pz.zoomBy(1 / 1.4);
  });
  let rz = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => {
      if (route.view !== 'map') return;
      if (isPhone()) setSheet(sheetState, false);
      route.space ? focusSpace(route.space, false) : pz.fit(false);
    });
  });
  mq.addEventListener('change', () => { sheet.className = 'sheet'; sheetState = 'peek'; render(); });

  pz.fit(false);
  setLayer('plan');
  render();
})();
