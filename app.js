const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const hexes = YIJING_DATA.hexagrams;
const byNum = Object.fromEntries(hexes.map((h) => [h.number, h]));
const tri = YIJING_DATA.trigrams;
const order = YIJING_DATA.trigramOrder;

let lastResult = null;
let currentDetailHex = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function show(id) {
  $$(".view").forEach((v) => v.classList.remove("active"));
  $("#" + id).classList.add("active");
  $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  window.scrollTo(0, 0);
}

function isReady(h) {
  return h.textStatus && h.textStatus.includes("已录入");
}

function modNum(n, m) {
  const r = Number(n) % m;
  return r === 0 ? m : r;
}

function trigramByNum(n) {
  return order[n - 1];
}

function hexByCombo(upper, lower) {
  return hexes.find((h) => h.upper === upper && h.lower === lower);
}

function changedHex(h, line) {
  const arr = [...h.lines];
  arr[line - 1] = arr[line - 1] ? 0 : 1;
  const lowerName = Object.keys(tri).find((k) => tri[k].lines.join("") === arr.slice(0, 3).join(""));
  const upperName = Object.keys(tri).find((k) => tri[k].lines.join("") === arr.slice(3, 6).join(""));
  return hexByCombo(upperName, lowerName);
}

function lineLabel(i) {
  return ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"][i - 1] || `${i}爻`;
}

function hexByLines(lines) {
  const key = lines.join("");
  return hexes.find((h) => h.lines.join("") === key);
}

function relatedHexes(h) {
  const inverse = hexByLines(h.lines.map((x) => x ? 0 : 1));
  const reverse = hexByLines([...h.lines].reverse());
  const mutualLines = [h.lines[1], h.lines[2], h.lines[3], h.lines[2], h.lines[3], h.lines[4]];
  const mutual = hexByLines(mutualLines);
  return { mutual, inverse, reverse };
}

function relationCards(h, compact = false) {
  const { mutual, inverse, reverse } = relatedHexes(h);
  const items = [
    { title: "本卦", label: "当前局势", hex: h },
    { title: "互卦", label: "内在结构 / 隐含动力", hex: mutual },
    { title: "错卦", label: "反面镜像 / 对立提醒", hex: inverse },
    { title: "综卦", label: "换位观察 / 反向视角", hex: reverse }
  ].filter((x) => x.hex);
  return `<div class="${compact ? "relation-grid compact" : "relation-grid"}">${items.map((it) => `
    <button class="relation-card" onclick="openHex(${it.hex.number})" type="button">
      <div class="rel-symbol">${it.hex.symbol}</div>
      <strong>${it.title}：${it.hex.name}</strong>
      <span>${it.label}</span>
    </button>
  `).join("")}</div>`;
}

function studySummary(h) {
  const s = h.study || {};
  return `<div class="study-summary">
    <h3>${esc(s.keyNote || "卦意摘要")}</h3>
    <p>${esc(s.oneLineMeaning || h.plain || "")}</p>
    <div class="keyword-row">${(s.keywords || []).map((k) => `<span class="keyword">${esc(k)}</span>`).join("")}</div>
    <p class="muted"><strong>适用场景：</strong>${(s.situations || []).map(esc).join("、")}</p>
    <p><strong>行动建议：</strong>${esc(s.actionAdvice || "")}</p>
    <p><strong>风险提醒：</strong>${esc(s.riskWarning || "")}</p>
  </div>`;
}

function applicationBlock(h) {
  const a = h.study?.applications || {};
  const rows = [
    ["事业 / 工作", a.career],
    ["经商 / 财务", a.business],
    ["合作 / 人际", a.relationship],
    ["决策 / 风险", a.decision],
    ["修身 / 心态", a.self]
  ];
  return `<div class="application-list">${rows.map(([k, v]) => `
    <div class="app-row"><strong>${k}</strong><p>${esc(v || "")}</p></div>
  `).join("")}</div>`;
}

function commentaryBlock(h) {
  const c = h.commentary || {};
  const rows = [
    ["合参总览", c.overview],
    ["王弼义理取向", c.wangBiStyle],
    ["程颐义理取向", c.chengYiStyle],
    ["朱熹本义取向", c.zhuXiStyle],
    ["象数结构提示", c.xiangShu],
    ["现实合参", c.applicationBridge]
  ];
  return `<div class="commentary-list">${rows.map(([k, v]) => `
    <details class="commentary-item" ${k === "合参总览" ? "open" : ""}>
      <summary>${k}</summary>
      <p>${esc(v || "")}</p>
    </details>
  `).join("")}
  <p class="quality-note">${esc(c.qualityTag || "")}</p></div>`;
}

function classicalStudyBlock(h) {
  const s = h.classicalStudy || {};
  if (!(s.completion || "").startsWith("complete_v1_2")) {
    return `<div class="pending-box">
      <strong>v1.2 核引状态：</strong>${esc(s.sourceStatus || "待后续批次完成。")}
    </div>`;
  }

  const rows = [
    ["原典重点", s.originalFocus],
    ["王弼义理摘要", s.wangBiSummary],
    ["程颐义理摘要", s.chengYiSummary],
    ["朱熹本义摘要", s.zhuXiSummary],
    ["象数结构", s.xiangShuFocus],
    ["现实合参", s.practicalSynthesis],
    ["关键爻位提醒", s.keyLineReminder]
  ];

  return `<div class="classical-study">
    ${rows.map(([k, v]) => `
      <details class="commentary-item" ${k === "原典重点" ? "open" : ""}>
        <summary>${k}</summary>
        <p>${esc(v || "")}</p>
      </details>
    `).join("")}
    <div class="study-questions">
      <strong>学习复盘问题</strong>
      <ol>${(s.studyQuestions || []).map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
    </div>
    <p class="quality-note">${esc(s.sourceStatus || "")}</p>
  </div>`;
}

function sourceTraceBlock(h) {
  const t = h.sourceTrace || {};
  return `<div class="source-trace">
    <p><strong>核引状态：</strong>${esc(t.status || "")}</p>
    ${t.coreTextSource ? `<p><a class="source-link" href="${esc(t.coreTextSource)}" target="_blank" rel="noopener">本卦原典来源 ↗</a></p>` : ""}
    ${t.ctextBookOfChanges ? `<p><a class="source-link" href="${esc(t.ctextBookOfChanges)}" target="_blank" rel="noopener">Chinese Text Project《周易》资源 ↗</a></p>` : ""}
    ${t.zhuXiWikisourceVol1 ? `<p><a class="source-link" href="${esc(t.zhuXiWikisourceVol1)}" target="_blank" rel="noopener">朱熹《原本周易本义》卷一 ↗</a></p>` : ""}
    <p class="muted">${esc(t.note || "")}</p>
  </div>`;
}

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem("yijing_records") || "[]");
  } catch {
    return [];
  }
}

function setRecords(records) {
  localStorage.setItem("yijing_records", JSON.stringify(records));
}

function getNote(n) {
  return localStorage.getItem("note_" + n) || "";
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem("yijing_favorites") || "[]");
  } catch {
    return [];
  }
}

function isFavorite(n) {
  return getFavorites().includes(n);
}

function toggleFavorite(n) {
  let favs = getFavorites();
  favs = favs.includes(n) ? favs.filter((x) => x !== n) : [...favs, n];
  localStorage.setItem("yijing_favorites", JSON.stringify(favs));
  renderHomeStats();
  renderLibrary();
  if (currentDetailHex === n) openHex(n, true);
}

function searchableText(h) {
  return [
    h.number, h.name, h.symbol, h.upper, h.lower, h.guaMeaning,
    h.guaci, h.guaciPlain, h.tuan, h.tuanPlain, h.xiang, h.xiangPlain,
    h.plain,
    h.study?.keyNote,
    h.study?.oneLineMeaning,
    ...(h.study?.keywords || []),
    ...(h.study?.situations || []),
    h.study?.actionAdvice,
    h.study?.riskWarning,
    ...(Object.values(h.study?.applications || {})),
    ...(Object.values(h.commentary || {})),
    JSON.stringify(h.classicalStudy || {}),
    JSON.stringify(h.sourceTrace || {}),
    ...(h.yao || []),
    ...(h.yaoPlain || [])
  ].join(" ");
}

function renderHomeStats() {
  const rc = $("#recordCount");
  const fc = $("#favoriteCount");
  if (rc) rc.textContent = getRecords().length;
  if (fc) fc.textContent = getFavorites().length;
}

function dailyHexNumber() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return (seed % 64) + 1;
}

function renderLibrary() {
  const q = $("#searchInput").value.trim();
  const f = $("#filterSelect").value;

  const list = hexes.filter((h) => {
    const qOk = !q || searchableText(h).includes(q);
    const fOk =
      f === "all" ||
      (f === "ready" && isReady(h)) ||
      (f === "favorite" && isFavorite(h.number));
    return qOk && fOk;
  });

  $("#hexList").innerHTML = list.map((h) => `
    <button class="hex-card" onclick="openHex(${h.number})" type="button">
      <div class="hex-top">
        <div class="hex-symbol">${h.symbol}</div>
        <div>
          <div class="hex-name">${isFavorite(h.number) ? "★ " : ""}第${h.number}卦 ${h.name}</div>
          <div>
            <span class="pill">${h.upperSymbol}${h.upper}上</span>
            <span class="pill">${h.lowerSymbol}${h.lower}下</span>
            <span class="pill ready">${isReady(h) ? "完整" : "待校"}</span>
          </div>
          <p class="key-note">${esc(h.study?.keyNote || "")}</p>
          <p class="hex-summary">${esc(h.study?.oneLineMeaning || h.plain || h.guaciPlain || "")}</p>
          <div class="mini-keywords">${(h.study?.keywords || []).slice(0, 4).map((k) => `<span>${esc(k)}</span>`).join("")}</div>
        </div>
      </div>
    </button>
  `).join("") || "<div class='card'>没有找到匹配的卦。</div>";
}

function formatHexText(h) {
  return `第${h.number}卦 ${h.name} ${h.symbol}
${h.upperSymbol}${h.upper}上 · ${h.lowerSymbol}${h.lower}下 · ${h.guaMeaning || ""}

卦辞：
${h.guaci}
译文：${h.guaciPlain || h.plain || ""}

彖传：
${h.tuan || ""}
译文：${h.tuanPlain || ""}

象传：
${h.xiang || ""}
译文：${h.xiangPlain || ""}

六爻：
${(h.yao || []).map((y, i) => `${lineLabel(i + 1)}：${y}
译文：${(h.yaoPlain || [])[i] || ""}`).join("\n\n")}

白话学习提示：
${h.plain || ""}`;
}

async function copyText(text, okMessage = "已复制。") {
  try {
    await navigator.clipboard.writeText(text);
    alert(okMessage);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    alert(okMessage);
  }
}

async function shareOrCopy(text, title = "我的易经") {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch {
      // User canceled or share failed; fall through to copy.
    }
  }
  await copyText(text, "当前设备不支持直接分享，已复制文字。");
}

function openHex(n, keepView = false) {
  const h = byNum[n];
  currentDetailHex = n;

  $("#detailBox").innerHTML = `
    <div class="card detail-head">
      <div class="symbol">${h.symbol}</div>
      <h2>第${h.number}卦 ${h.name}</h2>
      <p>${h.upperSymbol}${h.upper}上 · ${h.lowerSymbol}${h.lower}下 · ${h.guaMeaning || ""}</p>
      <p><span class="pill ready">${h.quality || "完整录入"}</span></p>
      <div class="actions center">
        <button class="secondary" onclick="toggleFavorite(${h.number})" type="button">${isFavorite(h.number) ? "★ 已收藏" : "☆ 收藏本卦"}</button>
        <button class="secondary" onclick="copyHex(${h.number})" type="button">复制卦文</button>
        ${h.sourceUrl ? `<a class="source-link button-link" href="${h.sourceUrl}" target="_blank" rel="noopener">公开原文来源 ↗</a>` : ""}
      </div>
    </div>

    <div class="card">${studySummary(h)}</div>

    <div class="card">
      <h3>卦象关系</h3>
      <p class="muted">本卦看当前局势，互卦看内在动力，错卦看反面提醒，综卦看换位视角。</p>
      ${relationCards(h)}
    </div>

    <div class="card">
      <h3>现实应用</h3>
      ${applicationBlock(h)}
    </div>

    <div class="card">
      <h3>v1.2 经典核引学习层</h3>
      <p class="muted">第1—16卦已完成高质量核引摘要；其余卦会在后续批次继续完成。此层强调来源状态、原典重点、经典义理与现实复盘。</p>
      ${classicalStudyBlock(h)}
      <div class="section">
        <h3>来源追踪</h3>
        ${sourceTraceBlock(h)}
      </div>
    </div>

    <div class="card">
      <h3>v1.1B 经典注解合参</h3>
      <p class="muted">这是学习型摘要，不是逐字引文。用于帮助你从义理、修身、本义、象数与现实应用五个角度理解本卦。</p>
      ${commentaryBlock(h)}
    </div>

    <div class="card">
      <div class="section first">
        <h3>卦辞</h3>
        <p class="classic">${esc(h.guaci)}</p>
        <p class="translation"><strong>译文：</strong>${esc(h.guaciPlain || h.plain || "待精校补入。")}</p>
      </div>

      <div class="section">
        <h3>彖传</h3>
        <p class="classic">${esc(h.tuan || "待精校补入。")}</p>
        <p class="translation"><strong>译文：</strong>${esc(h.tuanPlain || "待精校补入。")}</p>
      </div>

      <div class="section">
        <h3>象传</h3>
        <p class="classic">${esc(h.xiang || "待精校补入。")}</p>
        <p class="translation"><strong>译文：</strong>${esc(h.xiangPlain || "待精校补入。")}</p>
      </div>

      <div class="section">
        <h3>六爻</h3>
        ${(h.yao || []).map((y, i) => `
          <div class="yao">
            <strong>${lineLabel(i + 1)}</strong><br>
            <span class="classic">${esc(y)}</span>
            <p class="translation"><strong>译文：</strong>${esc((h.yaoPlain || [])[i] || "待精校补入。")}</p>
          </div>
        `).join("")}
      </div>

      <div class="section">
        <h3>白话学习提示</h3>
        <p>${esc(h.plain || "")}</p>
      </div>

      <div class="section">
        <h3>我的学习笔记</h3>
        <textarea id="noteText" rows="5" placeholder="写下你对本卦的理解、关键词、案例或复盘……">${esc(getNote(h.number))}</textarea>
        <div class="actions">
          <button class="primary" onclick="saveNote(${h.number})" type="button">保存笔记</button>
          <button class="secondary" onclick="clearNote(${h.number})" type="button">清空笔记</button>
        </div>
      </div>
    </div>
  `;

  if (!keepView) show("detail");
}

function copyHex(n) {
  copyText(formatHexText(byNum[n]), "已复制本卦完整内容。");
}

function saveNote(n) {
  localStorage.setItem("note_" + n, $("#noteText").value);
  alert("已保存学习笔记。");
}

function clearNote(n) {
  if (!confirm("清空本卦学习笔记？")) return;
  localStorage.removeItem("note_" + n);
  openHex(n, true);
}

function resultText(r) {
  const h = byNum[r.hex];
  const ch = byNum[r.changed];
  const line = r.line;
  return `我的易经｜数字卦结果

所问：${r.question || "未填写"}
数字：${r.n1} / ${r.n2} / ${r.n3}

本卦：第${h.number}卦 ${h.name} ${h.symbol}
动爻：第${line}爻
变卦：第${ch.number}卦 ${ch.name} ${ch.symbol}

本卦卦辞：
${h.guaci}
译文：${h.guaciPlain || ""}

动爻：
${h.yao[line - 1]}
译文：${(h.yaoPlain || [])[line - 1] || ""}

变卦卦辞：
${ch.guaci}
译文：${ch.guaciPlain || ""}

学习式提示：
${interpret(r, h, ch)}

现实应用：
当前局势：${h.study?.oneLineMeaning || ""}
风险提醒：${h.study?.riskWarning || ""}
行动建议：${h.study?.actionAdvice || ""}
后续方向：${ch.study?.oneLineMeaning || ""}

v1.2核引：
${h.classicalStudy?.originalFocus || h.classicalStudy?.sourceStatus || ""}
${h.classicalStudy?.practicalSynthesis || ""}

经典合参：
${h.commentary?.overview || ""}
${h.commentary?.applicationBridge || ""}

复盘备注：
${r.reflection || ""}`;
}

function interpret(r, h, ch) {
  const lineHint = [
    "事情仍在初始层，重点是观察、蓄势、守住根基。",
    "资源、关系或支持开始显现，重点是建立连接与信任。",
    "处在内外压力交错的位置，重点是谨慎、辨险与避免急进。",
    "将进未进，重点是试探、调整策略，并保持正道。",
    "时位相对成熟，重点是承担责任、发挥影响力与守中。",
    "已接近极点，重点是收束、防过度，并准备转化。"
  ][r.line - 1];

  return `${h.study?.keyNote || h.name}：${h.study?.oneLineMeaning || h.plain || h.guaciPlain || ""} 本次动爻在${lineLabel(r.line)}，提示：${lineHint} 变卦为「${ch.name}」，其方向可理解为：${ch.study?.oneLineMeaning || ch.plain || ""} 建议从“时机、位置、进退、风险、应对”五个角度复盘。`;
}

function renderResult(r) {
  const h = byNum[r.hex];
  const ch = byNum[r.changed];
  const line = r.line;

  $("#resultBox").innerHTML = `
    <div class="card result-card">
      <h2>起卦结果</h2>

      <div class="result-title">
        <div>
          <div class="result-symbol">${h.symbol}</div>
          <strong>本卦<br>第${h.number}卦 ${h.name}</strong>
        </div>
        <div>
          <div class="result-mid">动爻</div>
          <strong>${lineLabel(line)}<br>第${line}爻</strong>
        </div>
        <div>
          <div class="result-symbol">${ch.symbol}</div>
          <strong>变卦<br>第${ch.number}卦 ${ch.name}</strong>
        </div>
      </div>

      <div class="section">
        <h3>算法明细</h3>
        <p class="muted">第一组 ${esc(r.n1)} → ${h.upperSymbol}${h.upper}上；第二组 ${esc(r.n2)} → ${h.lowerSymbol}${h.lower}下；第三组 ${esc(r.n3)} → 第${line}爻动。</p>
      </div>

      <div class="section">
        <h3>本卦卦辞</h3>
        <p class="classic">${esc(h.guaci)}</p>
        <p class="translation"><strong>译文：</strong>${esc(h.guaciPlain || "")}</p>
      </div>

      <div class="section active-line">
        <h3>动爻</h3>
        <p class="classic">${esc(h.yao[line - 1])}</p>
        <p class="translation"><strong>译文：</strong>${esc((h.yaoPlain || [])[line - 1] || "")}</p>
      </div>

      <div class="section">
        <h3>变卦方向</h3>
        <p class="classic">${esc(ch.guaci)}</p>
        <p class="translation"><strong>${ch.name}提示：</strong>${esc(ch.guaciPlain || ch.plain || "")}</p>
      </div>

      <div class="section">
        <h3>学习式解读</h3>
        <p>${esc(interpret(r, h, ch))}</p>
      </div>

      <div class="section">
        <h3>现实应用解读</h3>
        <div class="application-list">
          <div class="app-row"><strong>当前局势</strong><p>${esc(h.study?.oneLineMeaning || "")}</p></div>
          <div class="app-row"><strong>关键变化点</strong><p>${esc((h.yaoPlain || [])[line - 1] || h.yao[line - 1] || "")}</p></div>
          <div class="app-row"><strong>风险提醒</strong><p>${esc(h.study?.riskWarning || "")}</p></div>
          <div class="app-row"><strong>行动建议</strong><p>${esc(h.study?.actionAdvice || "")}</p></div>
          <div class="app-row"><strong>后续方向</strong><p>${esc(ch.study?.oneLineMeaning || ch.plain || "")}</p></div>
        </div>
      </div>

      <div class="section">
        <h3>v1.2 核引提示</h3>
        ${(h.classicalStudy?.completion || "").startsWith("complete_v1_2") ? `
          <div class="application-list">
            <div class="app-row"><strong>原典重点</strong><p>${esc(h.classicalStudy.originalFocus || "")}</p></div>
            <div class="app-row"><strong>关键爻位</strong><p>${esc(h.classicalStudy.keyLineReminder || "")}</p></div>
            <div class="app-row"><strong>现实合参</strong><p>${esc(h.classicalStudy.practicalSynthesis || "")}</p></div>
            <div class="app-row"><strong>复盘问题</strong><p>${esc((h.classicalStudy.studyQuestions || []).join(" / "))}</p></div>
          </div>
        ` : `<div class="pending-box">${esc(h.classicalStudy?.sourceStatus || "本卦将在 v1.2 后续批次完成核引。")}</div>`}
      </div>

      <div class="section">
        <h3>经典合参提示</h3>
        <div class="application-list">
          <div class="app-row"><strong>义理主旨</strong><p>${esc(h.commentary?.overview || "")}</p></div>
          <div class="app-row"><strong>处事提醒</strong><p>${esc(h.commentary?.chengYiStyle || "")}</p></div>
          <div class="app-row"><strong>象数观察</strong><p>${esc(h.commentary?.xiangShu || "")}</p></div>
          <div class="app-row"><strong>现实问题框架</strong><p>${esc(h.commentary?.applicationBridge || "")}</p></div>
        </div>
      </div>

      <div class="section">
        <h3>辅助观察：互卦 / 错卦 / 综卦</h3>
        <p class="muted">这不是额外占断，而是帮助你从内在结构、反面风险、换位视角学习本卦。</p>
        ${relationCards(h, true)}
      </div>

      <div class="section">
        <h3>复盘问题</h3>
        <ul class="clean-list">
          <li>这件事现在处于开始、发展、压力、转折、成熟还是收束阶段？</li>
          <li>我是否在正确的位置上行动？有没有越位、失位或不及？</li>
          <li>本卦提醒我要守、进、退、等、变，还是先修正内部？</li>
          <li>动爻对应的风险是什么？我可以怎样提前化解？</li>
          <li>变卦代表的后续方向，对我的下一步有什么提醒？</li>
        </ul>
      </div>

      <label>我的当下理解 / 复盘备注
        <textarea id="reflection" rows="4" placeholder="记录你的判断、感受、后续行动和未来复盘……">${esc(r.reflection || "")}</textarea>
      </label>

      <div class="actions">
        <button class="primary" onclick="saveRecord()" type="button">保存本次卜卦</button>
        <button class="secondary" onclick="copyCurrentResult()" type="button">复制结果</button>
        <button class="secondary" onclick="shareCurrentResult()" type="button">分享/导出文字</button>
        <button class="secondary" onclick="openHex(${h.number})" type="button">查看本卦</button>
        <button class="secondary" onclick="openHex(${ch.number})" type="button">查看变卦</button>
      </div>
    </div>
  `;
}

function calculateDivination() {
  const n1 = $("#n1").value.trim();
  const n2 = $("#n2").value.trim();
  const n3 = $("#n3").value.trim();

  if (!n1 || !n2 || !n3 || !/^\d+$/.test(n1 + n2 + n3)) {
    alert("请输入三组纯数字。");
    return;
  }

  const upper = trigramByNum(modNum(n1, 8));
  const lower = trigramByNum(modNum(n2, 8));
  const line = modNum(n3, 6);
  const h = hexByCombo(upper, lower);
  const ch = changedHex(h, line);

  lastResult = {
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    question: $("#question").value.trim(),
    n1, n2, n3,
    upper, lower, line,
    hex: h.number,
    changed: ch.number,
    appVersion: "1.2 Final"
  };

  renderResult(lastResult);
}

function clearDivination() {
  ["#question", "#n1", "#n2", "#n3"].forEach((id) => $(id).value = "");
  $("#resultBox").innerHTML = "";
  lastResult = null;
}

function saveRecord() {
  if (!lastResult) return;
  lastResult.reflection = $("#reflection")?.value.trim() || "";
  const records = getRecords();
  const existingIndex = records.findIndex((r) => r.id === lastResult.id);
  if (existingIndex >= 0) records[existingIndex] = lastResult;
  else records.unshift(lastResult);
  setRecords(records);
  alert("已保存卜卦记录。");
  renderRecords();
  renderHomeStats();
  show("records");
}

function copyCurrentResult() {
  if (!lastResult) return;
  lastResult.reflection = $("#reflection")?.value.trim() || "";
  copyText(resultText(lastResult), "已复制本次起卦结果。");
}

function shareCurrentResult() {
  if (!lastResult) return;
  lastResult.reflection = $("#reflection")?.value.trim() || "";
  shareOrCopy(resultText(lastResult), "我的易经｜数字卦结果");
}

function renderRecords() {
  const q = ($("#recordSearch")?.value || "").trim();
  const records = getRecords().filter((r) => {
    const h = byNum[r.hex];
    const ch = byNum[r.changed];
    const txt = [r.question, r.reflection, h?.name, ch?.name, r.n1, r.n2, r.n3].join(" ");
    return !q || txt.includes(q);
  });

  $("#recordsList").innerHTML = records.length ? records.map((r) => {
    const h = byNum[r.hex];
    const ch = byNum[r.changed];
    return `
      <div class="record-card">
        <h3>${h.symbol} ${h.name} → ${ch.symbol} ${ch.name}</h3>
        <p class="muted">${new Date(r.time).toLocaleString()} · 数字：${esc(r.n1)} / ${esc(r.n2)} / ${esc(r.n3)} · 动爻：${r.line}</p>
        ${r.question ? `<p><strong>所问：</strong>${esc(r.question)}</p>` : ""}
        ${r.reflection ? `<p><strong>备注：</strong>${esc(r.reflection)}</p>` : ""}
        <div class="record-actions">
          <button class="secondary" onclick="viewRecord('${r.id}')" type="button">查看结果</button>
          <button class="secondary" onclick="copyRecord('${r.id}')" type="button">复制</button>
          <button class="secondary" onclick="openHex(${h.number})" type="button">本卦</button>
          <button class="danger" onclick="delRecord('${r.id}')" type="button">删除</button>
        </div>
      </div>
    `;
  }).join("") : "<div class='card'>还没有匹配的卜卦记录。</div>";
}

function viewRecord(id) {
  const record = getRecords().find((r) => r.id === id);
  if (!record) return;
  lastResult = { ...record };
  renderResult(lastResult);
  show("divine");
}

function copyRecord(id) {
  const record = getRecords().find((r) => r.id === id);
  if (!record) return;
  copyText(resultText(record), "已复制这条卜卦记录。");
}

function delRecord(id) {
  if (!confirm("删除这条记录？")) return;
  setRecords(getRecords().filter((r) => r.id !== id));
  renderRecords();
  renderHomeStats();
}

function exportBackup() {
  const payload = {
    app: "我的易经｜学习与数字卦",
    version: "1.2 Final",
    exportedAt: new Date().toISOString(),
    records: getRecords(),
    favorites: getFavorites(),
    notes: Object.keys(localStorage)
      .filter((k) => k.startsWith("note_"))
      .map((k) => [k, localStorage.getItem(k)])
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "yijing-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      if (payload.records) setRecords(payload.records);
      if (payload.favorites) localStorage.setItem("yijing_favorites", JSON.stringify(payload.favorites));
      if (payload.notes) payload.notes.forEach(([k, v]) => localStorage.setItem(k, v));
      renderRecords();
      renderLibrary();
      renderHomeStats();
      alert("导入完成。");
    } catch (err) {
      alert("导入失败：备份文件格式不正确。");
    }
  };
  reader.readAsText(file);
}

function setupEvents() {
  $$("[data-tab]").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));

  $("#installBtn").addEventListener("click", () => $("#installDialog").showModal());
  $("#closeInstall").addEventListener("click", () => $("#installDialog").close());

  $("#dailyHexBtn").addEventListener("click", () => openHex(dailyHexNumber()));
  $("#searchInput").addEventListener("input", renderLibrary);
  $("#filterSelect").addEventListener("change", renderLibrary);

  $("#calcBtn").addEventListener("click", calculateDivination);
  $("#clearDivineBtn").addEventListener("click", clearDivination);

  $("#recordSearch").addEventListener("input", renderRecords);
  $("#exportBtn").addEventListener("click", exportBackup);
  $("#importFile").addEventListener("change", (e) => {
    importBackup(e.target.files[0]);
    e.target.value = "";
  });
}

setupEvents();
renderHomeStats();
renderLibrary();
renderRecords();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.warn);
}

// Expose functions used by inline buttons.
window.openHex = openHex;
window.toggleFavorite = toggleFavorite;
window.copyHex = copyHex;
window.saveNote = saveNote;
window.clearNote = clearNote;
window.saveRecord = saveRecord;
window.copyCurrentResult = copyCurrentResult;
window.shareCurrentResult = shareCurrentResult;
window.viewRecord = viewRecord;
window.copyRecord = copyRecord;
window.delRecord = delRecord;
