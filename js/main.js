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

  /* =========================================================
     中文斷句：換行只落在詞與詞之間
     中文沒有空格，瀏覽器預設會在任何兩個字中間換行，常把「救援」「友善」拆成兩行。
     這裡用瀏覽器內建的斷詞器（Intl.Segmenter）找出詞的邊界，在邊界插入 <wbr>（可換行點），
     再由 CSS 的 .seg { word-break: keep-all } 關掉其他位置的換行。
     瀏覽器不支援斷詞器時什麼都不做，維持原本的自動換行。
     ========================================================= */
  const breakByPhrase = () => {
    if (typeof Intl === 'undefined' || !Intl.Segmenter) return;
    const segmenter = new Intl.Segmenter('zh-Hant', { granularity: 'word' });

    // 斷詞器不認得、但不能拆開的詞（地名、人名、動保用語）。之後文案出現新詞就加在這裡。
    const KEEP = [
      '龜島浪攤子', '源頭減量', '風雨無阻', '一點一點', '合不合拍', '助糧天使', '台灣之心', '菩提護生',
      '甲仙芋筍節', '貓狗抓紮', '犬貓抓紮', '肢體殘缺', '生病受傷', '長期照護',
      '動保網路', '流浪動物', '流浪犬貓', '社會資源',
      '愛護動物協會', '原地回置', '貼出',
      '六龜區', '甲仙區', '荖濃里', '建山里', '芋筍節', '送養會', '待送養', '棄養潮', '吐司邊', '龍眼蜜',
      '羅小姐', '李永立', '在地人', '公斤數', '捐物資', '拍張照', '貓巷口', '中秋節', '整理中',
      '更多人', '甲仙段',
      '抓紮', '結紮', '絕育', '節育', '南橫', '六龜', '甲仙', '九如', '浪浪', '毛孩', '剪耳', '缺角',
      '送養', '領養', '棄養', '助糧', '貓巷', '舞吉', '粉專', '狗園', '狗場', '犬貓', '貓狗', '狗狗',
      '貓咪', '小貓', '幼犬', '幼貓', '公貓', '母貓', '母狗', '公狗', '飼料', '果乾', '義賣', '晶片',
      '誘捕', '回置', '動保', '等家', '來電', '私訊', '通報', '收容', '偏鄉', '鄉親', '各里', '場次',
      '志工', '公視', '見底',
    ].sort((a, b) => b.length - a.length);

    // 不能拆開的格式：電話、日期、數字＋單位、#標籤
    const PATTERNS = [
      /#[^\s#]+/y,
      /0\d{3} \d{3} \d{3}/y,
      /\d{4} 年(?: \d{1,2} 月)?/y,
      /\d[\d,]*(?: ?(?:隻|年|天|包|歲|級|場|次))?/y,
    ];
    const OPEN = '「『（《〈【(';
    const CLOSE = '，。、；：！？）」』》〉】…—～・｜,.!?:;)％%';
    const STOP = /[，。、；：！？｜]\s*$/;          // 這些標點後面本來就適合換行
    const NUMERAL = /[一二兩三四五六七八九十幾每]$/;
    // 單字助詞：黏在前一個詞後面（流浪「的」、孩子「們」、場次「中」）
    const SUFFIX = '的了著過們嗎呢吧啊喔呀地得裡後前時中';
    const isCJK = (ch) => /[㐀-鿿]/.test(ch);
    const visibleLength = (s) => s.replace(/[\s，。、；：！？「」『』（）《》]/g, '').length;

    // 文字 → 詞（keep 表示整塊不可拆）
    const tokenize = (text) => {
      const tokens = [];
      let plain = '';
      const flush = () => {
        if (!plain) return;
        for (const s of segmenter.segment(plain)) tokens.push({ t: s.segment, keep: false });
        plain = '';
      };
      let i = 0;
      while (i < text.length) {
        let hit = '';
        for (const re of PATTERNS) {
          re.lastIndex = i;
          const m = re.exec(text);
          if (m && m[0]) { hit = m[0]; break; }
        }
        if (!hit) hit = KEEP.find((w) => text.startsWith(w, i)) || '';
        if (hit) {
          flush();
          tokens.push({ t: hit.replace(/ /g, ' '), keep: true });   // 裡面的空格改成不換行空格
          i += hit.length;
        } else {
          plain += text[i];
          i += 1;
        }
      }
      flush();
      return tokens;
    };

    // 詞 → 可以整塊換行的小段：標點跟著前一個詞，單一個字跟著旁邊的詞
    const toChunks = (tokens) => {
      const chunks = [];
      let pending = '';        // 等著接到下一個詞前面的字（「讓」「在」「不」、上引號…）
      let pendingCount = 0;
      const push = (s) => { chunks.push(pending + s); pending = ''; pendingCount = 0; };

      tokens.forEach(({ t, keep }) => {
        if (keep) {
          // 「累計 2,805 隻」「突破 1,280 隻」：數字跟前面的短詞黏在一起
          const before = chunks[chunks.length - 1];
          if (!pending && before && /\s$/.test(before) && /^\d/.test(t)
              && visibleLength(before) <= 3 && !STOP.test(before)) {
            chunks[chunks.length - 1] = before.trimEnd() + '\u00a0' + t;
            return;
          }
          push(t);
          return;
        }
        if (/^\s+$/.test(t)) {
          if (pendingCount) pending += '\u00a0';      // 「約 120 隻」「打 0977…」：前面的字跟數字黏在一起
          else if (chunks.length) chunks[chunks.length - 1] += t;
          else pending += t;
          return;
        }
        if ([...t].every((ch) => CLOSE.includes(ch))) {
          const prev = chunks[chunks.length - 1];
          if (!chunks.length) push(t);
          else if (!pendingCount) chunks[chunks.length - 1] += t;
          else if (pendingCount <= 2 && !STOP.test(prev) && !/\s$/.test(prev)) {
            chunks[chunks.length - 1] += pending + t;   // 「公路」＋「邊，」→「公路邊，」
            pending = ''; pendingCount = 0;
          } else push(t);
          return;
        }
        if ([...t].every((ch) => OPEN.includes(ch))) { pending += t; return; }
        const single = t.length === 1 && isCJK(t);
        const prev = chunks[chunks.length - 1] || '';
        if (single && !pendingCount && chunks.length
            && ((SUFFIX.includes(t) && !STOP.test(prev) && !/\s$/.test(prev)) || NUMERAL.test(prev))) {
          chunks[chunks.length - 1] += t;              // 助詞、量詞接在前一個詞後面（流浪「的」、第一「場」）
          return;
        }
        if (single) {
          pending += t;
          pendingCount += 1;
          if (pendingCount >= 3) push('');
          return;
        }
        push(t);
      });

      const glueNext = pendingCount > 0 || (pending !== '' && !/^\s+$/.test(pending));
      if (pending) chunks.push(pending);

      // 讓詞組更完整：
      // ①「的」後面接兩個字以內的詞（流浪的＋生命、不理解的＋聲音）
      // ② 句子或逗號後面開頭的兩個字，跟著下一個詞（我們＋會說明、請先＋來電）
      const merged = [];
      chunks.forEach((c) => {
        const prev = merged[merged.length - 1];
        const beforePrev = merged[merged.length - 2];
        if (prev !== undefined && !STOP.test(prev) && !/\s$/.test(prev)) {
          const afterDe = /的$/.test(prev) && visibleLength(c) <= 2;
          const clauseStart = visibleLength(prev) <= 2 && (beforePrev === undefined || STOP.test(beforePrev));
          if (afterDe || clauseStart) { merged[merged.length - 1] += c; return; }
        }
        merged.push(c);
      });
      return { chunks: merged, glueNext };
    };

    const BLOCKS = '.ln,h1,h2,h3,p,li,dd,dt,summary,figcaption,.bubble,.tnr-callout';
    const SKIP = 'svg,script,style,nav,.en,.btn,.chip,.marquee,.sr-only,.count,.float-cta,a[href^="mailto:"]';
    const groups = new Map();
    document.querySelectorAll('main, .site-footer').forEach((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!node.nodeValue.trim() || !parent || parent.closest(SKIP)) continue;
        const blockEl = parent.closest(BLOCKS);
        if (!blockEl) continue;
        if (!groups.has(blockEl)) groups.set(blockEl, []);
        groups.get(blockEl).push(node);
      }
    });

    groups.forEach((nodes, blockEl) => {
      const isHeading = blockEl.matches('h1,h2,h3,summary') || !!blockEl.closest('h1,h2,h3,summary');
      let glue = true;       // 區塊開頭不需要換行點
      let prevEnd = '';
      nodes.forEach((node, index) => {
        const text = node.nodeValue;
        const { chunks: words, glueNext } = toChunks(tokenize(text));
        // 標題、問句：每一段至少 4 個字，讀起來才是完整的詞組（逗號後面照常可以換行）
        let chunks = words;
        if (isHeading) {
          chunks = [];
          words.forEach((w) => {
            const prev = chunks[chunks.length - 1];
            if (prev !== undefined && visibleLength(prev) < 4 && !STOP.test(prev)) chunks[chunks.length - 1] += w;
            else chunks.push(w);
          });
        }
        // 最後一行至少留 4 個字，避免只剩一兩個字孤零零掉到下一行
        if (index === nodes.length - 1) {
          while (chunks.length > 1 && visibleLength(chunks[chunks.length - 1]) < 4
              && visibleLength(chunks[chunks.length - 2] + chunks[chunks.length - 1]) <= 10) {
            // U+2060 是看不見的「不可換行」記號：讓這一小段連標點、引號前後都不會斷開
            const tail = chunks.pop()
              .replace(/([「『（《〈【])/g, '\u2060$1')
              .replace(/([，。、；：！？）」』》〉】])(?=\S)/g, '$1\u2060');
            chunks[chunks.length - 1] += '\u2060' + tail;
          }
        }
        const frag = document.createDocumentFragment();
        chunks.forEach((chunk, k) => {
          const first = chunk.trimStart()[0] || '';
          const joinsNodes = k === 0 && !glue && isCJK(prevEnd) && isCJK(first) && !SUFFIX.includes(first);
          if (k > 0 || joinsNodes) frag.appendChild(document.createElement('wbr'));
          frag.appendChild(document.createTextNode(chunk));
        });
        glue = glueNext;
        prevEnd = text.trimEnd().slice(-1);
        node.replaceWith(frag);
      });
      blockEl.classList.add('seg');
    });
  };
  breakByPhrase();

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
