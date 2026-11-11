(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header 捲動狀態 ---------- */
  const header = document.querySelector('.site-header');
  const floatCta = document.querySelector('.float-cta');
  const footer = document.querySelector('.site-footer');

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* 捲到頁尾時收起浮動按鈕，避免擋住聯絡資訊 */
  if (floatCta && footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      floatCta.classList.toggle('is-hidden', entry.isIntersecting);
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

  /* ---------- 減少動態：暫停 SVG 動畫 ---------- */
  if (reduceMotion) {
    document.querySelectorAll('svg').forEach((svg) => {
      if (typeof svg.pauseAnimations === 'function') svg.pauseAnimations();
    });
  }

  /* ---------- 年份 ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
