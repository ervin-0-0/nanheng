(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* =========================================================
     插畫：把 <use href="#零件"> 展開成真正的節點
     這樣零件裡的待機動畫（搖尾巴、眨眼…）在每個瀏覽器都會動，
     而且每個角色各自錯開時間，不會全部同時眨眼。
     沒有 JS 時 <use> 仍會正常顯示插畫。
     ========================================================= */
  const STATIC_ICONS = new Set(['chev', 'icon-fb', 'icon-ig', 'icon-threads', 'icon-line']);

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
  const breakByPhrase = (roots = document.querySelectorAll('main, .site-footer')) => {
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
      '送養', '領養', '棄養', '助糧', '貓巷', '舞吉', '粉專', '狗園', '狗場', '犬貓', '貓狗', '狗貓', '狗狗', '勸募許可', '法人登記', '捐款方式', '政府核發', '受傷', '警示燈', '電線桿', '透氣孔', '紙箱', '獸夾夾住', '獸夾', '獸鋏', '愛媽', '愛爸', '互助', '代餵', '誘捕籠', '定時定點', '固定時間', '固定地方', '收乾淨', '乾飼料', '廚餘', '魚骨頭', '族群', '牽線', '登記表', '看醫生', '山豬吊', '野生動物', '獼猴', '山羌', '猛禽', '掃晶片', '動物醫院', '市民專線', '動物保護處', '存證', '來車', '找主人', '人手有限', '剪耳缺角', '已結紮', '免植入', '台灣之心', '依體重', '不剪耳', '計價', '不定期', '以粉專', '一眼', '除蚤藥', '口服錠', '滴劑', '體重級距', '跳蚤', '最常用到', '滴劑或口服錠', '入會', '會務', '收支', '用量', '過期',
      '貓咪', '小貓', '幼犬', '幼貓', '公貓', '母貓', '母狗', '公狗', '飼料', '果乾', '義賣', '晶片',
      '誘捕', '回置', '動保', '等家', '來電', '私訊', '通報', '收容', '偏鄉', '鄉親', '各里', '場次',
      '志工', '公視', '見底', '加好友', '傳訊息',
      // 認養浪浪
      '一輩子', '房東', '租屋', '陪玩', '便便', '疫苗', '狂犬病', '寵物登記', '過戶', '名下', '外出籠', '睡窩', '貓砂盆', '牽繩', '項圈', '飯碗', '水碗',
      '身分證', '收容所', '壽山', '燕巢', '園區', '開園', '國定假日', '繁殖', '十幾年', '待認養', '認養', '合作醫院', '步調', '作息', '動保處', '撒嬌', '硬抱', '角落', '管理系統', '收容編號', '縣市',
    ].sort((a, b) => b.length - a.length);

    // 不能拆開的格式：電話、日期、數字＋單位、#標籤
    const PATTERNS = [
      /#[^\s#]+/y,
      /0\d{3} \d{3} \d{3}/y,
      /\d{4} 年(?: \d{1,2} 月)?/y,
      /\d[\d,]*(?: ?(?:小時|個月|隻|年|天|週|包|歲|級|場|次|萬|元))?/y,
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
    const toChunks = (tokens, cap = 10) => {
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
          else if (pendingCount <= 2 && !STOP.test(prev) && !/\s$/.test(prev)
              && visibleLength(prev + pending) <= Math.max(cap, 4)) {
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
          // 合起來不能比一行還長（窄卡片、系統字體放大時），不然會被硬切
          const fits = visibleLength(prev + c) <= Math.max(cap, 4);
          if ((afterDe || clauseStart) && fits) { merged[merged.length - 1] += c; return; }
        }
        merged.push(c);
      });
      return { chunks: merged, glueNext };
    };

    const BLOCKS = '.ln,h1,h2,h3,p,li,dd,dt,summary,figcaption,.bubble,.tnr-callout';
    const SKIP = 'svg,script,style,nav,.en,.btn,.chip,.marquee,.sr-only,.count,.float-cta,.nowrap,a[href^="mailto:"]';
    const groups = new Map();
    roots.forEach((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!node.nodeValue.trim() || !parent || parent.closest(SKIP)) continue;
        const blockEl = parent.closest(BLOCKS);
        if (!blockEl || blockEl.classList.contains('seg')) continue;   // 已經處理過的不再處理
        if (!groups.has(blockEl)) groups.set(blockEl, []);
        groups.get(blockEl).push(node);
      }
    });

    // 每個區塊一行大約放得下幾個字（先全部量完再改 DOM，避免手機反覆重排）。
    // 句尾黏在一起的那一段不能比一行還寬，不然會被硬切，反而把「。」單獨擠到下一行。
    // 手機開了「系統字體放大」時（--tz > 1），一行放得下的字更少，黏的長度跟著縮短。
    const tz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tz')) || 1;
    const tailCap = new Map();
    groups.forEach((_, blockEl) => {
      let box = blockEl.matches('.ln') ? blockEl.parentElement : blockEl;
      while (box && !box.clientWidth) box = box.parentElement;   // 收合的 FAQ 答案量外層
      const fontPx = parseFloat(getComputedStyle(blockEl).fontSize) || 17;
      const perLine = box ? box.clientWidth / (fontPx * tz) : 18;
      tailCap.set(blockEl, Math.max(3, Math.min(10, Math.floor(perLine * 0.6))));
    });

    groups.forEach((nodes, blockEl) => {
      const isHeading = blockEl.matches('h1,h2,h3,summary') || !!blockEl.closest('h1,h2,h3,summary');
      const cap = tailCap.get(blockEl);
      let glue = true;       // 區塊開頭不需要換行點
      let prevEnd = '';
      nodes.forEach((node, index) => {
        const text = node.nodeValue;
        const { chunks: words, glueNext } = toChunks(tokenize(text), cap);
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
              && visibleLength(chunks[chunks.length - 2] + chunks[chunks.length - 1]) <= cap) {
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
  const carousels = new Map();
  const initCarousel = (list) => {
    let state = carousels.get(list);
    if (!state) {
      state = { dots: document.createElement('div'), items: [], ticking: false };
      state.dots.className = 'dots';
      state.dots.setAttribute('aria-hidden', 'true');
      list.after(state.dots);
      state.update = () => {
        state.ticking = false;
        const start = list.getBoundingClientRect().left;
        let best = 0;
        let bestDist = Infinity;
        state.items.forEach((item, i) => {
          const dist = Math.abs(item.getBoundingClientRect().left - start - 20);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        if (list.scrollLeft >= list.scrollWidth - list.clientWidth - 4) best = state.items.length - 1;
        [...state.dots.children].forEach((dot, i) => dot.classList.toggle('is-on', i === best));
      };
      list.addEventListener('scroll', () => {
        if (!state.ticking) { state.ticking = true; window.requestAnimationFrame(state.update); }
      }, { passive: true });
      carousels.set(list, state);
    }
    state.items = [...list.children];
    state.dots.replaceChildren(...state.items.map(() => document.createElement('span')));
    state.update();
  };
  document.querySelectorAll('[data-carousel]').forEach(initCarousel);

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

  /* ---------- 相片集：分類、看更多、全螢幕看圖 ---------- */
  const gallery = document.querySelector('.gallery');
  const lightbox = document.querySelector('.lightbox');
  if (gallery && lightbox) {
    const items = [...gallery.querySelectorAll('.g-item')];
    const filters = [...gallery.querySelectorAll('.g-filter')];
    const grid = gallery.querySelector('.gallery-grid');
    const pile = gallery.querySelector('.g-pile');
    const moreN = gallery.querySelector('.g-more-n');
    const wide = window.matchMedia('(min-width: 761px)');
    const desk = window.matchMedia('(min-width: 1001px)');
    let cat = 'all';
    let expanded = false;

    const matching = () => items.filter((it) => cat === 'all' || it.dataset.cat === cat);
    const render = () => {
      const list = matching();
      // 一開始攤開幾排（手機 4 排、平板電腦 3 排），最後一格放「還沒攤開的那一疊」
      const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 2;
      const first = cols * (wide.matches ? 3 : 4) - 1;
      // 剩不到 3 張就不用疊，直接全部攤開
      const limit = expanded || list.length <= first + 2 ? list.length : first;
      items.forEach((it) => { it.hidden = true; });
      list.slice(0, limit).forEach((it) => { it.hidden = false; });
      const rest = list.length - limit;
      pile.hidden = rest === 0;
      moreN.textContent = rest;
    };
    filters.forEach((btn) => btn.addEventListener('click', () => {
      cat = btn.dataset.cat;
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      expanded = false;
      render();
    }));
    pile.addEventListener('click', () => {
      const firstNew = matching().find((it) => it.hidden);
      expanded = true;
      render();
      if (firstNew) firstNew.focus({ preventScroll: true });
    });
    wide.addEventListener('change', render);
    desk.addEventListener('change', render);
    render();

    const lbFig = lightbox.querySelector('.lb-figure');
    const lbImg = lbFig.querySelector('img');
    const lbTitle = lbFig.querySelector('.lb-title');
    const lbDesc = lbFig.querySelector('.lb-desc');
    const lbCount = lightbox.querySelector('.lb-count');
    let list = [];
    let idx = 0;
    let opener = null;

    const show = (i) => {
      idx = (i + list.length) % list.length;
      const img = list[idx].querySelector('img');
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbTitle.textContent = list[idx].querySelector('.g-cap').textContent;
      lbDesc.textContent = img.alt;
      lbCount.textContent = `${idx + 1} / ${list.length}`;
      lbFig.classList.remove('is-in');
      void lbFig.offsetWidth;          // 重新觸發換張動畫
      lbFig.classList.add('is-in');
    };
    const open = (item) => {
      list = matching();               // 看圖時可以一路滑完這個分類，包含還沒展開的
      opener = item;
      show(list.indexOf(item));
      if (typeof lightbox.showModal === 'function') lightbox.showModal();
      else lightbox.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
    };
    const close = () => {
      if (typeof lightbox.close === 'function') lightbox.close();
      else { lightbox.removeAttribute('open'); lightbox.dispatchEvent(new Event('close')); }
    };

    items.forEach((it) => it.addEventListener('click', () => open(it)));
    lightbox.addEventListener('close', () => {
      document.body.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    });
    lightbox.querySelector('.lb-close').addEventListener('click', close);
    lightbox.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
    lightbox.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });

    // 手機左右滑換張；點照片以外的暗處關閉（剛滑完不算點）
    let startX = null;
    let startY = 0;
    let swiped = false;
    lightbox.addEventListener('pointerdown', (e) => { startX = e.clientX; startY = e.clientY; swiped = false; });
    lightbox.addEventListener('pointercancel', () => { startX = null; });
    lightbox.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swiped = true;
        show(idx + (dx < 0 ? 1 : -1));
      }
    });
    lightbox.addEventListener('click', (e) => {
      if (swiped) { swiped = false; return; }
      if (e.target === lightbox) close();
    });
  }

  /* ---------- 給 js/sheet.js（試算表內容）用的小工具 ---------- */
  window.Nanheng = { breakText: breakByPhrase, initCarousel };

  /* ---------- 年份 ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
