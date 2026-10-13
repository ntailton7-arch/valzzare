(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ ABERTURA CINEMATOGRAFICA (canvas, sem texto) ============ */
  const canvas = $('#scene');
  const ctx = canvas.getContext('2d');
  const DUR = 7.6;

  // [cor inicial, cor final, tem veios]
  const MATS = {
    walnut: ['#3a2314', '#6b4429', true],
    walnut2: ['#2e1c10', '#59381f', true],
    oak: ['#a9855c', '#cfae80', true],
    oak2: ['#9a764d', '#bf9c70', true],
    sand: ['#cbbfab', '#e9e2d4', false],
    stone: ['#cfc6b8', '#ece6da', true],
    black: ['#141413', '#262422', false],
    glow: ['#efd7ac', '#f8e8c8', false],
    metal: ['#85817a', '#c4bfb5', false],
    light: ['#f6deb0', '#fff0cf', false]
  };

  let W = 0, H = 0, dpr = 1, quads = [], geo = { nx: 0, ny: 0 };

  function rng(seed) {
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  function build() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(320, Math.round(r.width));
    H = Math.max(480, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const portrait = W < H * .85;
    const B = portrait ? { x0: .12, y0: .31, x1: .88, y1: .63 } : { x0: .3, y0: .27, x1: .7, y1: .69 };
    const O = { x0: -.06, y0: -.06, x1: 1.06, y1: 1.06 };
    const px = (x, y) => [x * W, y * H];
    const Bp = (u, v) => px(lerp(B.x0, B.x1, u), lerp(B.y0, B.y1, v));
    const Lp = (s, t) => {
      const x = lerp(O.x0, B.x0, s), yt = lerp(O.y0, B.y0, s), yb = lerp(O.y1, B.y1, s);
      return px(x, lerp(yt, yb, t));
    };
    const Rp = (s, t) => {
      const x = lerp(O.x1, B.x1, s), yt = lerp(O.y0, B.y0, s), yb = lerp(O.y1, B.y1, s);
      return px(x, lerp(yt, yb, t));
    };
    const Fp = (s, u) => {
      const y = lerp(O.y1, B.y1, s);
      return px(lerp(lerp(O.x0, B.x0, s), lerp(O.x1, B.x1, s), u), y);
    };
    const Cp = (s, u) => {
      const y = lerp(O.y0, B.y0, s);
      return px(lerp(lerp(O.x0, B.x0, s), lerp(O.x1, B.x1, s), u), y);
    };

    quads = [];
    const R = rng(7);
    const add = (p, mat, o = {}) => {
      const q = Object.assign({ p, mat, shade: .1, t0: 1, t1: 2, f0: 3.2, f1: 4.2, m0: 4.6 + quads.length * .02 }, o);
      q.grain = Array.from({ length: 14 }, () => [R(), R() * .5 + .08, R() < .5]);
      quads.push(q);
    };

    // Teto e fita de luz indireta
    add([Cp(0, 0), Cp(0, 1), Cp(1, 1), Cp(1, 0)], 'sand', { shade: .38, t0: 1.3, t1: 2.6, f0: 3.3 });
    add([Cp(0, .45), Cp(0, .55), Cp(1, .55), Cp(1, .45)], 'light', { shade: 0, t0: 2.2, t1: 3.1, f0: 5, f1: 5.8, m0: 5 });

    // Piso em tabuas de madeira
    for (let i = 0; i < 7; i++) {
      const u0 = i / 7, u1 = (i + 1) / 7 - .004;
      add([Fp(0, u0), Fp(0, u1), Fp(1, u1), Fp(1, u0)], i % 2 ? 'oak2' : 'oak',
        { shade: .16, t0: 1.1 + i * .1, t1: 2.2 + i * .1, f0: 3.7 + i * .1, f1: 4.7 + i * .1 });
    }

    // Parede do fundo
    add([Bp(0, 0), Bp(1, 0), Bp(1, 1), Bp(0, 1)], 'sand', { shade: .2, t0: 1.5, t1: 2.8, f0: 3.1, f1: 4.1 });

    // Armario alto (3 portas em nogueira)
    for (let i = 0; i < 3; i++) {
      add([Bp(i * .12, 0), Bp((i + 1) * .12 - .006, 0), Bp((i + 1) * .12 - .006, 1), Bp(i * .12, 1)], 'walnut',
        { shade: .08, t0: 2.3 + i * .15, t1: 3.3 + i * .15, f0: 3.9 + i * .2, f1: 4.9 + i * .2 });
    }

    // Nicho com prateleiras
    add([Bp(.44, .1), Bp(.64, .1), Bp(.64, .56), Bp(.44, .56)], 'glow', { shade: 0, t0: 2.6, t1: 3.6, f0: 4.3, f1: 5.2, m0: 4.9 });
    [.29, .43].forEach((v, i) => add([Bp(.44, v), Bp(.64, v), Bp(.64, v + .018), Bp(.44, v + .018)], 'black',
      { shade: 0, t0: 3 + i * .2, t1: 3.7 + i * .2, f0: 4.6 + i * .2, f1: 5.3 + i * .2 }));

    // Bancada em pedra e armario baixo preto fosco
    add([Bp(.4, .62), Bp(1, .62), Bp(1, .7), Bp(.4, .7)], 'stone', { shade: .06, t0: 2.8, t1: 3.8, f0: 4.6, f1: 5.4 });
    for (let i = 0; i < 3; i++) {
      add([Bp(.4 + i * .2, .7), Bp(.4 + (i + 1) * .2 - .006, .7), Bp(.4 + (i + 1) * .2 - .006, 1), Bp(.4 + i * .2, 1)], 'black',
        { shade: .05, t0: 3 + i * .15, t1: 4 + i * .15, f0: 4.8 + i * .15, f1: 5.6 + i * .15 });
    }

    // Parede esquerda: ripado de madeira
    for (let i = 0; i < 9; i++) {
      const s0 = i / 9, s1 = (i + 1) / 9 - .008;
      add([Lp(s0, 0), Lp(s1, 0), Lp(s1, 1), Lp(s0, 1)], i % 2 ? 'walnut2' : 'walnut',
        { shade: .05 + .3 * (1 - i / 9), t0: 2 + i * .08, t1: 3 + i * .08, f0: 3.5 + i * .12, f1: 4.5 + i * .12 });
    }

    // Parede direita: portas com puxadores metalicos
    for (let i = 0; i < 3; i++) {
      const s0 = i / 3, s1 = (i + 1) / 3 - .01;
      add([Rp(s0, 0), Rp(s1, 0), Rp(s1, 1), Rp(s0, 1)], i === 1 ? 'oak' : 'black',
        { shade: .05 + .3 * (1 - i / 3), t0: 2.2 + i * .2, t1: 3.3 + i * .2, f0: 4.2 + i * .25, f1: 5.1 + i * .25 });
      add([Rp(s1 - .03, .3), Rp(s1 - .02, .3), Rp(s1 - .02, .56), Rp(s1 - .03, .56)], 'metal',
        { shade: 0, t0: 4.6 + i * .2, t1: 5.2 + i * .2, f0: 5.2 + i * .2, f1: 5.8 + i * .2, m0: 5.2 + i * .2 });
    }

    const n = Bp(.54, .33);
    geo.nx = n[0]; geo.ny = n[1];
  }

  function pathQuad(p) {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
  }

  function strokePartial(p, prog) {
    const lens = [], total = [0, 1, 2, 3].reduce((s, i) => {
      const a = p[i], b = p[(i + 1) % 4], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      lens.push(l); return s + l;
    }, 0);
    let left = prog * total;
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 0; i < 4 && left > 0; i++) {
      const a = p[i], b = p[(i + 1) % 4], k = clamp(left / lens[i]);
      ctx.lineTo(lerp(a[0], b[0], k), lerp(a[1], b[1], k));
      left -= lens[i];
    }
    ctx.stroke();
  }

  function ambience(t) {
    const a = 1 - clamp((t - 2) / 2.5) * .7;
    ctx.save();
    ctx.globalAlpha = .05 * a;
    ctx.strokeStyle = '#d8cbb9';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const x = (i / 40) * W + Math.sin(i * 7.3) * 8;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const x = ((t * .06 + i * .4) % 1.5 - .25) * W;
      const g = ctx.createLinearGradient(x - W * .15, 0, x + W * .15, 0);
      g.addColorStop(0, 'rgba(255,214,160,0)');
      g.addColorStop(.5, `rgba(255,214,160,${.07 * a})`);
      g.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.rotate(.25); ctx.translate(-W / 2, -H / 2);
      ctx.fillStyle = g;
      ctx.fillRect(x - W * .15, -H * .3, W * .3, H * 1.6);
      ctx.restore();
    }
  }

  function drawQuad(q, t) {
    const f = ease(clamp((t - q.f0) / (q.f1 - q.f0)));
    if (f > 0) {
      const m = ease(clamp((t - q.m0) / 1.6));
      ctx.save();
      pathQuad(q.p);
      ctx.clip();
      ctx.translate(0, (1 - f) * H * .03);
      ctx.globalAlpha = f;
      ctx.fillStyle = '#232220';
      ctx.fillRect(-W, -H, 3 * W, 3 * H);
      if (m > 0) {
        const c = MATS[q.mat];
        const g = ctx.createLinearGradient(q.p[0][0], q.p[0][1], q.p[2][0], q.p[2][1]);
        g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
        ctx.globalAlpha = f * m;
        ctx.fillStyle = g;
        ctx.fillRect(-W, -H, 3 * W, 3 * H);
        if (c[2]) {
          for (const gr of q.grain) {
            const a = [lerp(q.p[0][0], q.p[1][0], gr[0]), lerp(q.p[0][1], q.p[1][1], gr[0])];
            const b = [lerp(q.p[3][0], q.p[2][0], gr[0]), lerp(q.p[3][1], q.p[2][1], gr[0])];
            ctx.strokeStyle = gr[2] ? `rgba(0,0,0,${gr[1] * .5})` : `rgba(255,255,255,${gr[1] * .12})`;
            ctx.lineWidth = 1 + gr[1] * 2;
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          }
        }
        if (q.shade) {
          ctx.globalAlpha = f;
          ctx.fillStyle = `rgba(0,0,0,${q.shade * m})`;
          ctx.fillRect(-W, -H, 3 * W, 3 * H);
        }
      }
      ctx.restore();
    }
    const lp = clamp((t - q.t0) / (q.t1 - q.t0));
    if (lp > 0) {
      const fade = 1 - .72 * clamp((t - 5.4) / 1.6);
      ctx.save();
      ctx.strokeStyle = `rgba(244,240,233,${.8 * fade})`;
      ctx.lineWidth = 1;
      strokePartial(q.p, ease(lp));
      ctx.restore();
    }
  }

  function light(t) {
    const L = ease(clamp((t - 4.8) / 2));
    if (L <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(geo.nx, geo.ny, 0, geo.nx, geo.ny, W * .3);
    g.addColorStop(0, `rgba(255,190,120,${.3 * L})`); g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createLinearGradient(0, 0, 0, H * .5);
    g.addColorStop(0, `rgba(255,200,140,${.12 * L})`); g.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * .5);
    g = ctx.createRadialGradient(W / 2, H * .92, 0, W / 2, H * .92, W * .5);
    g.addColorStop(0, `rgba(255,180,110,${.12 * L})`); g.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const gx = lerp(-.3, 1.3, clamp((t - 5.4) / 2.2)) * W;
    g = ctx.createLinearGradient(gx - W * .12, 0, gx + W * .12, H * .3);
    g.addColorStop(0, 'rgba(255,240,215,0)'); g.addColorStop(.5, `rgba(255,240,215,${.07 * L})`); g.addColorStop(1, 'rgba(255,240,215,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0b0a';
    ctx.fillRect(0, 0, W, H);
    const k = ease(clamp(t / DUR)), sc = 1 + .09 * k;
    ctx.save();
    ctx.translate(W / 2 - 12 * k, H / 2);
    ctx.scale(sc, sc);
    ctx.translate(-W / 2, -H / 2);
    ambience(t);
    for (const q of quads) drawQuad(q, t);
    light(t);
    ctx.restore();
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .25, W / 2, H / 2, Math.max(W, H) * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    const fadeIn = 1 - clamp(t / .9);
    if (fadeIn > 0) { ctx.fillStyle = `rgba(11,11,10,${fadeIn})`; ctx.fillRect(0, 0, W, H); }
  }

  /* ============ REVEAL ============ */
  let io = null;
  function setupReveal() {
    const items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('in-view')); return; }
    io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
    }, { threshold: .14, rootMargin: '0px 0px -6% 0px' });
    items.filter(el => !el.closest('.hero')).forEach(el => io.observe(el));
  }
  function revealHero() {
    const items = $$('.hero [data-reveal]');
    if (io) items.forEach(el => io.observe(el)); else items.forEach(el => el.classList.add('in-view'));
  }

  /* ============ CONTROLE DA ABERTURA ============ */
  let t = 0, last = 0, speed = 1, done = false;
  const skip = () => { speed = 8; };

  function finish() {
    if (done) return;
    done = true;
    draw(DUR);
    root.classList.remove('is-intro');
    canvas.classList.add('alive');
    try { sessionStorage.setItem('valzzare-intro', '1'); } catch (e) {}
    removeEventListener('pointerdown', skip);
    removeEventListener('keydown', skip);
    revealHero();
  }

  function tick(now) {
    if (done) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;
    t += dt * speed;
    if (t >= DUR) { finish(); return; }
    draw(t);
    requestAnimationFrame(tick);
  }

  function init() {
    build();
    setupReveal();
    if (root.classList.contains('is-intro')) {
      addEventListener('pointerdown', skip, { passive: true });
      addEventListener('keydown', skip);
      draw(0);
      requestAnimationFrame(n => { last = n; tick(n); });
    } else {
      done = true;
      draw(DUR);
      canvas.classList.add('alive');
      revealHero();
    }
  }

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      const w = canvas.getBoundingClientRect().width;
      if (Math.abs(w - W) < 2 && Math.abs(canvas.getBoundingClientRect().height - H) < 120) return;
      build();
      draw(done ? DUR : t);
    }, 150);
  });

  /* ============ NAV, PARALLAX E PROGRESSO ============ */
  const nav = $('#nav'), burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#menu a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }));
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) burger.click();
  });

  const heroContent = $('#heroContent');
  const para = $$('[data-parallax]');
  const steps = $('#steps');
  const stepItems = steps ? $$('li', steps) : [];
  let ticking = false;

  function onScroll() {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    nav.classList.toggle('scrolled', y > 40);
    if (reduce) return;
    if (y < vh * 1.2) {
      heroContent.style.transform = `translateY(${y * .18}px)`;
      heroContent.style.opacity = String(1 - clamp(y / (vh * .8)) * .9);
    }
    para.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const k = parseFloat(el.dataset.parallax) || 0;
      el.style.translate = `0 ${((r.top + r.height / 2) - vh / 2) * k}px`;
    });
    if (steps) {
      const r = steps.getBoundingClientRect();
      const p = clamp((vh * .78 - r.top) / (r.height + vh * .1));
      steps.style.setProperty('--p', p.toFixed(3));
      stepItems.forEach((li, i) => li.classList.toggle('on', p >= i / stepItems.length + .02));
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  if (reduce && steps) { steps.style.setProperty('--p', 1); stepItems.forEach(li => li.classList.add('on')); }

  const yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  init();
  onScroll();
})();
