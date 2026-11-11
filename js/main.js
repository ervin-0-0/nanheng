(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* =========================================================
     插畫：把 <use href="#零件"> 展開成真正的節點
     這樣零件裡的待機動畫（搖尾巴、眨眼…）在每個瀏覽器都會動，
     而且每個角色各自錯開時間，不會全部同時眨眼。
     沒有 JS 時 <use> 仍會正常顯示插畫。
     ========================================================= */
  const STATIC_ICONS = new Set(['chev', 'icon-fb']);

  const expandUse = (use) => {
    const id = (use.getAttribute('href') || '').replace('#', '');
    const src = id && document.getElementById(id);
    if (!src || STATIC_ICONS.has(id)) return;

    const wrap = document.createElementNS(SVG_NS, 'g');
    wrap.setAttribute('class', `u ${use.getAttribute('class') || ''}`.trim());
    if (use.hasAttribute('style')) wrap.setAttribute('style', use.getAttribute('style'));
    if (use.hasAttribute('fill')) wrap.setAttribute('fill', use.getAttribute('fill'));
    [...use.attributes].forEach((a) => {
      if (a.name.startsWith('data-')) wrap.setAttribute(a.name, a.value);
    });
    if (!wrap.style.getPropertyValue('--ad')) {
      wrap.style.setProperty('--ad', `${(-Math.random() * 5).toFixed(2)}s`);
    }

    const x = use.getAttribute('x') || 0;
    const y = use.getAttribute('y') || 0;
    let inner;
    if (src.tagName.toLowerCase() === 'symbol') {
      inner = document.createElementNS(SVG_NS, 'svg');
      inner.setAttribute('viewBox', src.getAttribute('viewBox'));
      inner.setAttribute('x', x);
      inner.setAttribute('y', y);
      ['width', 'height'].forEach((k) => {
        if (use.hasAttribute(k)) inner.setAttribute(k, use.getAttribute(k));
      });
      inner.setAttribute('overflow', 'visible');
      src.childNodes.forEach((n) => inner.appendChild(n.cloneNode(true)));
    } else {
      inner = src.cloneNode(true);
      inner.removeAttribute('id');
      if (Number(x) || Number(y)) inner.setAttribute('transform', `translate(${x} ${y})`);
    }
    wrap.appendChild(inner);

    let node = wrap;
    if (use.hasAttribute('transform')) {
      node = document.createElementNS(SVG_NS, 'g');
      node.setAttribute('transform', use.getAttribute('transform'));
      node.appendChild(wrap);
    }
    use.replaceWith(node);
    inner.querySelectorAll('use').forEach(expandUse);
  };

  document.querySelectorAll('svg:not(.sprite) use').forEach(expandUse);

  /* ---------- 看不到的插畫先暫停，省電 ---------- */
  const artworks = [...document.querySelectorAll('svg:not(.sprite)')]
    .filter((svg) => !svg.parentElement.closest('svg'));

  const setPaused = (svg, paused) => {
    svg.classList.toggle('is-paused', paused);
    if (typeof svg.pauseAnimations === 'function') {
      if (paused || reduceMotion) svg.pauseAnimations();
      else svg.unpauseAnimations();
    }
  };

  if ('IntersectionObserver' in window) {
    const pio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setPaused(entry.target, !entry.isIntersecting));
    }, { rootMargin: '80px 0px' });
    artworks.forEach((svg) => pio.observe(svg));
  } else if (reduceMotion) {
    artworks.forEach((svg) => setPaused(svg, true));
  }

  /* ---------- 點一下毛孩：跳一下、冒出愛心 ---------- */
  const HEART = '<path d="M16 26 C 7 19.6, 1.4 14, 1.4 8.6 C 1.4 1.2, 12 -1, 16 6.6 C 19.6 -.4, 30.6 1.6, 30.6 8.8 C 30.6 14, 25 19.6, 16 26 Z" fill="#C7362B"/>';

  document.addEventListener('click', (e) => {
    const pet = e.target.closest ? e.target.closest('[data-pet]') : null;
    if (!pet) return;

    if (!reduceMotion) {
      pet.classList.remove('is-hop');
      pet.getBoundingClientRect();           // 重新觸發動畫
      pet.classList.add('is-hop');
      window.setTimeout(() => pet.classList.remove('is-hop'), 700);
    }

    const heart = document.createElementNS(SVG_NS, 'svg');
    heart.setAttribute('viewBox', '0 0 32 28');
    heart.setAttribute('class', 'tap-heart');
    heart.setAttribute('aria-hidden', 'true');
    heart.innerHTML = HEART;
    heart.style.left = `${e.pageX}px`;
    heart.style.top = `${e.pageY}px`;
    document.body.appendChild(heart);
    window.setTimeout(() => heart.remove(), 1000);
  });

  /* ---------- Header 捲動狀態、浮動按鈕 ---------- */
  const header = document.querySelector('.site-header');
  const floatCta = document.querySelector('.float-cta');
  const footer = document.querySelector('.site-footer');
  let footerVisible = false;

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
    // 首屏先不擋插畫，往下捲一點才出現；到頁尾再收起來
    if (floatCta) floatCta.classList.toggle('is-hidden', window.scrollY < 260 || footerVisible);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (floatCta && footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      footerVisible = entry.isIntersecting;
      onScroll();
    }, { threshold: 0.15 }).observe(footer);
  }

  /* ---------- 手機選單 ---------- */
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('mobile-menu');

  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };

  menuBtn.addEventListener('click', () => {
    setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setMenu(false);
      menuBtn.focus();
    }
  });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- 手機橫滑卡片：下方的小圓點 ---------- */
  document.querySelectorAll('[data-carousel]').forEach((list) => {
    const items = [...list.children];
    const dots = document.createElement('div');
    dots.className = 'dots';
    dots.setAttribute('aria-hidden', 'true');
    items.forEach(() => dots.appendChild(document.createElement('span')));
    list.after(dots);

    let ticking = false;
    const update = () => {
      ticking = false;
      const start = list.getBoundingClientRect().left;
      let best = 0;
      let bestDist = Infinity;
      items.forEach((item, i) => {
        const dist = Math.abs(item.getBoundingClientRect().left - start - 20);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      if (list.scrollLeft >= list.scrollWidth - list.clientWidth - 4) best = items.length - 1;
      [...dots.children].forEach((dot, i) => dot.classList.toggle('is-on', i === best));
    };
    list.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  });

  /* ---------- 進場動畫 ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- 數字跳動 ---------- */
  const counters = document.querySelectorAll('.count');
  const fmt = new Intl.NumberFormat('zh-TW');

  const runCount = (el) => {
    const to = Number(el.dataset.to);
    if (reduceMotion) { el.textContent = fmt.format(to); return; }
    const dur = 1600;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt.format(Math.round(to * eased));
      if (t < 1) requestAnimationFrame(tick);
      else el.classList.add('is-done');
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCount(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- 年份 ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
