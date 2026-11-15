/* =========================================================
   從 Google 試算表讀「常改的內容」
   ─ 所需物資、結紮場次、最新消息、等家的孩子 ─

   設定方式：
   1. 試算表右上角「共用」→ 一般存取權改成「知道連結的任何人」＝檢視者。
   2. 把試算表網址裡 /d/ 和 /edit 中間那一長串，貼到下面的 SHEET_ID。
   讀不到（沒填 ID、沒網路、表格是空的）時，網頁會保留原本寫好的內容。
   試算表裡「顯示」填「否」的那一列不會出現在網站上（可以拿來放範例或暫存）。
   ========================================================= */
(() => {
  const SHEET_ID = '';
  const TABS = { supplies: '所需物資', sessions: '結紮場次', news: '最新消息', pets: '等家的孩子', help: '互助看板', aima: '互助設定' };
  const FB_PAGE = 'https://www.facebook.com/profile.php?id=100063551122273';
  const FB_MSG = 'https://m.me/100063551122273';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const helpers = window.Nanheng || { breakText() {}, initCarousel() {} };

  /* ---------- 讀資料 ---------- */
  const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  };

  // 第一列是欄位名稱；「顯示」填「否」的列略過；整列空白也略過
  const toObjects = (rows) => {
    const [head = [], ...body] = rows;
    const keys = head.map((h) => h.trim());
    return body
      .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || '').trim()])))
      .filter((o) => Object.values(o).some(Boolean) && o['顯示'] !== '否');
  };

  const loadTab = async (name) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      return toObjects(parseCSV(await res.text()));
    } finally {
      clearTimeout(timer);
    }
  };

  /* ---------- 小工具 ---------- */
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const svg = (markup, viewBox, label) => {
    const s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', viewBox);
    if (label) { s.setAttribute('role', 'img'); s.setAttribute('aria-label', label); }
    else s.setAttribute('aria-hidden', 'true');
    s.innerHTML = markup;           // 只放網站自己寫的插畫，不放試算表的文字
    return s;
  };
  const yes = (v) => /^(是|有|已|y|yes|v|✓|✔|o)/i.test(v || '');

  // 日期：2026/12/6、2026-12-06、115/12/6（民國年）、12/6/2026 都可以
  const parseDate = (s) => {
    const t = (s || '').trim();
    let m = t.match(/^(\d{3,4})\s*[\/\-.年]\s*(\d{1,2})\s*[\/\-.月]\s*(\d{1,2})/);
    if (m) {
      const y = Number(m[1]) < 1911 ? Number(m[1]) + 1911 : Number(m[1]);
      return new Date(y, Number(m[2]) - 1, Number(m[3]));
    }
    m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    return null;
  };
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const pad = (n) => String(n).padStart(2, '0');

  // 照片：Google 雲端硬碟的分享連結會換成可以直接顯示的網址；其他只接受 https 或網站裡的照片
  const imageUrl = (u) => {
    const t = (u || '').trim();
    const m = t.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&(?:amp;)?)?id=|thumbnail\?id=)([\w-]{20,})/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
    if (/^https:\/\/\S+$/.test(t)) return t;
    if (/^assets\/photos\/[\w.-]+$/.test(t)) return t;
    return '';
  };
  const safeLink = (u) => (/^https:\/\/\S+$/.test((u || '').trim()) ? u.trim() : '');

  /* ---------- 插畫（沒有照片時用） ---------- */
  const ART = {
    dog: '<use href="#dog" x="56" y="22" width="92" height="82" style="--fur:#E0CFAE;--ear:#8A5A3B;--collar:#E0503C"/>',
    cat: '<use href="#cat" x="72" y="14" width="64" height="84" style="--fur:#EE8A2B;--stripe:#B5452D"/>',
    rescue: '<use href="#dog-lie" x="34" y="44" width="132" height="67" style="--fur:#B5452D;--ear:#1F1B1A;--k:#F3E7CF;--collar:#F6C445"/><use href="#heart" x="150" y="20" width="22" height="19" fill="#E0503C"/>',
    tnr: '<use href="#cage-b" x="46" y="14" width="108" height="81"/><use href="#cat" x="76" y="26" width="48" height="63" style="--fur:#EE8A2B;--stripe:#B5452D"/><use href="#cage-f" x="46" y="14" width="108" height="81"/>',
    adopt: '<use href="#cat" x="44" y="22" width="56" height="74" style="--fur:#FFFDF8;--patch:#EE8A2B"/><use href="#dog" x="96" y="30" width="76" height="68" style="--fur:#E0CFAE;--ear:#8A5A3B;--collar:#3A8DC9"/>',
    other: '<use href="#heart" x="76" y="30" width="48" height="42" fill="#E0503C"/><use href="#paw" x="40" y="64" width="22" height="22" fill="#F5A6BE"/><use href="#paw" x="140" y="22" width="18" height="18" fill="#F5A6BE"/>',
  };
  const NEWS_STYLE = {
    救援: ['coral', 'peach', 'rescue'],
    送養: ['yellow', 'yellow', 'adopt'],
    結紮: ['mint', 'mint', 'tnr'],
    協會: ['mint', 'mint', 'other'],
    活動: ['sky', 'yellow', 'other'],
    媒體: ['sky', 'peach', 'other'],
  };

  /* ---------- 所需物資 ---------- */
  const renderSupplies = (rows) => {
    const r = rows.find((o) => o['品項']);
    const card = document.getElementById('supplies');
    if (!r || !card) return;
    const [p1, p2] = card.querySelectorAll('p');
    const why = (r['狀況'] || '').replace(/[，。,.\s]+$/, '');
    const extra = r['補充'] ? `（${r['補充'].replace(/^[（(]|[）)]$/g, '')}）` : '';
    const ask = (r['來電確認'] || '品項和數量').replace(/[。.\s]+$/, '');
    p1.textContent = `${why ? `${why}，` : ''}最常用到的是${r['品項']}${extra}。`;
    // 這一句固定不變：協會還沒拿到勸募許可，不能寫成向大家募集
    p2.textContent = `協會目前不公開募集物資。若您主動想捐，請先來電，確認${ask}。`;
    [p1, p2].forEach((p) => p.classList.remove('seg'));

    const pick = { 除蚤藥: null, 飼料: 'tpl-supply-feed', 其他: 'tpl-supply-box' }[r['圖示']] ?? 'tpl-supply-box';
    const art = card.querySelector('.supply-art');
    const tpl = pick && document.getElementById(pick);
    if (tpl && art) {
      const fresh = tpl.content.firstElementChild.cloneNode(true);
      fresh.setAttribute('aria-label', r['品項']);
      art.replaceWith(fresh);
    }
    helpers.breakText([card]);
  };

  /* ---------- 結紮場次（只顯示今天以後的，最多 4 場） ---------- */
  const renderSessions = (rows) => {
    const box = document.getElementById('tnr-sessions');
    if (!box) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const list = rows
      .map((o) => ({ ...o, date: parseDate(o['日期']) }))
      .filter((o) => o.date && o.date >= today && o['地點'])
      .sort((a, b) => a.date - b.date)
      .slice(0, 4);
    if (!list.length) return;
    const ul = box.querySelector('.session-list');
    ul.replaceChildren(...list.map((o) => {
      const li = el('li', 'session');
      const badge = el('span', 'session-date');
      badge.append(el('b', 'en', `${o.date.getMonth() + 1}/${o.date.getDate()}`), el('small', '', `週${WEEK[o.date.getDay()]}`));
      const body = el('span', 'session-body');
      body.append(el('strong', '', o['地點']));
      const meta = [o['時間'], o['名額'] && `名額 ${o['名額'].replace(/^名額\s*/, '')}`].filter(Boolean).join('・');
      if (meta) body.append(el('span', 'session-meta', meta));
      if (o['備註']) body.append(el('span', 'session-note', o['備註']));
      li.append(badge, body);
      return li;
    }));
    box.hidden = false;
    helpers.breakText([box]);
  };

  /* ---------- 最新消息（新的在前，最多 6 則） ---------- */
  const renderNews = (rows) => {
    const listEl = document.querySelector('.news-list');
    const items = rows
      .map((o) => ({ ...o, date: parseDate(o['日期']) }))
      .filter((o) => o['標題'])
      .sort((a, b) => (b.date || 0) - (a.date || 0))
      .slice(0, 6);
    if (!listEl || !items.length) return;
    listEl.replaceChildren(...items.map((o) => {
      const [chip, bg, art] = NEWS_STYLE[o['分類']] || ['', 'peach', 'other'];
      const li = el('li', 'news-card card');
      const a = el('a');
      a.href = safeLink(o['臉書連結']) || FB_PAGE;
      a.target = '_blank';
      a.rel = 'noopener';
      const thumb = el('div', 'news-thumb');
      const src = imageUrl(o['照片']);
      if (src) {
        const img = el('img');
        img.src = src; img.alt = o['標題']; img.loading = 'lazy'; img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => { thumb.classList.add(`news-thumb--${bg}`); img.replaceWith(svg(ART[art], '0 0 200 120')); });
        thumb.append(img);
      } else {
        thumb.classList.add(`news-thumb--${bg}`);
        thumb.append(svg(ART[art], '0 0 200 120'));
      }
      a.append(thumb);
      if (o.date) {
        const time = el('time', 'news-date en', `${o.date.getFullYear()}.${pad(o.date.getMonth() + 1)}.${pad(o.date.getDate())}`);
        time.dateTime = `${o.date.getFullYear()}-${pad(o.date.getMonth() + 1)}-${pad(o.date.getDate())}`;
        a.append(time);
      }
      a.append(el('h3', '', o['標題']));
      if (o['內容']) a.append(el('p', '', o['內容']));
      if (o['分類']) a.append(el('span', `chip${chip ? ` chip--${chip}` : ''}`, o['分類']));
      li.append(a);
      return li;
    }));
    helpers.breakText([listEl]);
    helpers.initCarousel(listEl);
  };

  /* ---------- 等家的孩子 ---------- */
  const renderPets = (rows) => {
    const box = document.getElementById('pets');
    const list = rows.filter((o) => o['名字']);
    if (!box || !list.length) return;
    const ul = box.querySelector('.pet-list');
    ul.replaceChildren(...list.map((o) => {
      const isCat = /貓/.test(o['種類']);
      const sex = /母/.test(o['性別']) ? 'female' : /公/.test(o['性別']) ? 'male' : '';
      const li = el('li', 'pet-card');
      const photo = el('div', `pet-photo pet-photo--${isCat ? 'cat' : 'dog'}`);
      const src = imageUrl(o['照片']);
      if (src) {
        const img = el('img');
        img.src = src; img.alt = `${o['名字']}的照片`; img.loading = 'lazy'; img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => img.replaceWith(svg(ART[isCat ? 'cat' : 'dog'], '0 0 200 120')));
        photo.append(img);
      } else {
        photo.append(svg(ART[isCat ? 'cat' : 'dog'], '0 0 200 120', isCat ? '貓咪插畫' : '狗狗插畫'));
      }
      const info = el('div', 'pet-info');
      const name = el('h4', 'pet-name', o['名字']);
      if (sex) {
        const badge = el('span', `pet-sex pet-sex--${sex}`);
        badge.setAttribute('aria-label', sex === 'female' ? '母' : '公');
        badge.append(svg(`<use href="#${sex}"/>`, '0 0 24 24'));
        name.append(badge);
      }
      info.append(name);
      const meta = [o['種類'], o['年紀']].filter(Boolean).join('・');
      if (meta) info.append(el('p', 'pet-meta', meta));
      if (o['個性']) info.append(el('p', 'pet-trait', o['個性']));
      const health = [['已結紮', '已結紮'], ['疫苗', '已打疫苗'], ['晶片', '有晶片']].filter(([k]) => yes(o[k]));
      if (health.length) {
        const hl = el('ul', 'pet-health');
        health.forEach(([, label]) => hl.append(el('li', '', label)));
        info.append(hl);
      }
      const btn = el('a', 'btn pet-btn', '私訊認識牠 ');
      btn.href = FB_MSG; btn.target = '_blank'; btn.rel = 'noopener';
      const arrow = el('span', 'btn-arrow');
      arrow.append(svg('<use href="#chev"/>', '0 0 12 12'));
      btn.append(arrow);
      info.append(btn);
      li.append(photo, info);
      return li;
    }));
    box.hidden = false;
    helpers.breakText([box]);
  };

  /* ---------- 愛媽 LINE 社群 ---------- */
  // 網址可以寫在 index.html 的 #line-join data-url，或試算表「互助設定」的「LINE社群網址」；只接受 LINE 的網址
  let lineUrl = '';
  const validLine = (u) => {
    const t = (u || '').trim();
    return /^https:\/\/(line\.me|lin\.ee)\/\S+$/.test(t) ? t : '';
  };
  const chev = () => svg('<use href="#chev"/>', '0 0 12 12');
  const pointToLine = (a, text) => {
    a.href = lineUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    const arrow = a.querySelector('.btn-arrow');
    if (arrow) a.replaceChildren(`${text} `, arrow);
    else a.replaceChildren(`${text} `, chev());
  };
  const loadQR = () => new Promise((resolve, reject) => {
    if (window.qrcode) { resolve(window.qrcode); return; }
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    sc.onload = () => resolve(window.qrcode);
    sc.onerror = reject;
    document.head.append(sc);
  });
  const setupLine = (u) => {
    const url = validLine(u);
    const card = document.getElementById('line-join');
    if (!url || !card) return;
    lineUrl = url;
    card.querySelector('.line-btn').href = url;
    card.hidden = false;
    // 互助看板的「我可以幫忙」、沒有需求時的按鈕，都改成到社群
    document.querySelectorAll('#help-list .text-link').forEach((a) => pointToLine(a, '到 LINE 社群回覆'));
    const emptyText = document.querySelector('.help-empty-text');
    const emptyBtn = document.querySelector('.help-empty-btn');
    if (emptyText) { emptyText.replaceChildren('需要人手代餵、借誘捕籠、載去看醫生嗎？', el('br'), '到 LINE 社群發問，附近的愛媽、愛爸會幫忙。'); emptyText.classList.remove('seg'); }
    if (emptyBtn) { pointToLine(emptyBtn, '到 LINE 社群發問'); emptyBtn.classList.add('is-line'); }
    helpers.breakText([card, document.getElementById('help-empty')].filter(Boolean));
    // 電腦版加 QR code，用手機掃描加入
    const qrBox = card.querySelector('.line-qr');
    if (qrBox && window.matchMedia('(min-width: 1001px)').matches) {
      loadQR().then((qrcode) => {
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
        qrBox.append(el('span', '', '手機掃描加入'));
      }).catch(() => {});
    }
  };

  /* ---------- 愛媽互助網：互助看板 ---------- */
  // 只放人力互助；提到錢的列不顯示（協會還沒有勸募許可）
  const HELP_ICON = {
    代餵: '<use href="#bowl" x="4" y="26" width="40" height="20"/><use href="#paw" x="14" y="2" width="20" height="20" fill="#EE8A2B"/>',
    借籠: '<use href="#cage-b" x="0" y="6" width="48" height="36"/><use href="#cat" x="14" y="9" width="20" height="26" style="--fur:#EE8A2B;--stripe:#B5452D"/><use href="#cage-f" x="0" y="6" width="48" height="36"/>',
    載送: '<use href="#truck" x="-2" y="10" width="52" height="30"/>',
    其他: '<use href="#heart" x="8" y="8" width="32" height="28" fill="#E0503C"/>',
  };
  const MONEY = /捐款|匯款|轉帳|現金|募款|募集|捐錢|贊助/;
  const renderHelp = (rows) => {
    const listEl = document.getElementById('help-list');
    const empty = document.getElementById('help-empty');
    const items = rows
      .filter((o) => o['需要什麼'] && !MONEY.test(o['需要什麼']))
      .map((o) => ({ ...o, date: parseDate(o['日期']) }))
      .sort((a, b) => (b.date || 0) - (a.date || 0))
      .slice(0, 6);
    if (!listEl || !items.length) return;
    listEl.replaceChildren(...items.map((o) => {
      const type = HELP_ICON[o['類型']] ? o['類型'] : '其他';
      const li = el('li', 'help-card');
      const icon = el('div', 'help-icon');
      icon.append(svg(HELP_ICON[type], '0 0 48 48'));
      const body = el('div', 'help-body');
      const tags = el('div', 'help-tags');
      if (o['地區']) tags.append(el('span', '', o['地區']));
      tags.append(el('span', 'help-type', type));
      body.append(tags, el('p', 'help-need', o['需要什麼']));
      const when = o['期間'] || (o.date ? `${o.date.getMonth() + 1}/${o.date.getDate()} 公告` : '');
      if (when) body.append(el('p', 'help-when', when));
      const a = el('a', 'text-link', '我可以幫忙 ');
      a.href = 'tel:0977755973';
      a.append(chev());
      if (lineUrl) pointToLine(a, '到 LINE 社群回覆');
      body.append(a);
      li.append(icon, body);
      return li;
    }));
    listEl.hidden = false;
    if (empty) empty.hidden = true;
    helpers.breakText([listEl]);
  };

  /* ---------- 愛媽互助網：登記表網址、誘捕籠借用說明 ---------- */
  const renderAimaSettings = (rows) => {
    const conf = Object.fromEntries(rows.map((o) => [o['項目'], o['內容']]));
    if (conf['LINE社群網址']) setupLine(conf['LINE社群網址']);
    const form = safeLink(conf['登記表網址']);
    const join = document.querySelector('#aima-join [data-role="join"]');
    if (form && join) {
      join.href = form;
      join.target = '_blank';
      join.rel = 'noopener';
      join.replaceChildren('填寫登記表 ', join.querySelector('svg') || '');
    }
    const trap = document.getElementById('aima-trap');
    if (trap && conf['誘捕籠借用說明']) {
      const p = trap.querySelector('p');
      p.textContent = conf['誘捕籠借用說明'];
      p.classList.remove('seg');
      helpers.breakText([trap]);
    }
  };

  /* ---------- 全部一起 ---------- */
  const renderAll = (data) => {
    const run = (fn, rows) => { try { if (rows && rows.length) fn(rows); } catch (e) { /* 單一區塊出錯不影響其他 */ } };
    run(renderSupplies, data.supplies);
    run(renderSessions, data.sessions);
    run(renderNews, data.news);
    run(renderPets, data.pets);
    run(renderHelp, data.help);
    run(renderAimaSettings, data.aima);
  };

  const load = async () => {
    const keys = Object.keys(TABS);
    const results = await Promise.allSettled(keys.map((k) => loadTab(TABS[k])));
    const data = {};
    results.forEach((r, i) => { if (r.status === 'fulfilled') data[keys[i]] = r.value; });
    renderAll(data);
    return data;
  };

  setupLine((document.getElementById('line-join') || {}).dataset?.url);

  window.NanhengSheet = { renderAll, parseCSV, toObjects, parseDate, imageUrl, setupLine };
  if (SHEET_ID) load();
})();
