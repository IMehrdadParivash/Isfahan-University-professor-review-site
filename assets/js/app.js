/* V18 simplified professor-level ratings. Course-level evidence stays internal and is aggregated per professor. */
const DATA_GZ = (window.__UI_DB_GZ_PARTS || []).join("");

async function __loadData() {
  if (!DATA_GZ) throw new Error("embedded dataset is missing");
  const bytes = Uint8Array.from(atob(DATA_GZ), character => character.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}

(async () => {
  const raw = await __loadData();
  const data = {
    stats: raw.s,
    faculties: raw.f,
    professors: raw.p.map(entry => ({
      id: entry[0],
      name_fa: entry[1],
      academic_rank: entry[2],
      faculty: entry[3],
      department: entry[4],
      official_profile_url: entry[5],
      review_coverage: {
        has_any_public_evidence: Boolean(entry[6][0]),
        structured_evidence_count: entry[6][1],
        qualitative_chat_evidence_count: entry[6][2],
        course_pair_count: entry[6][3],
        cautiously_rankable_course_pair_count: entry[6][4]
      },
      courses: entry[7].map(course => ({
        course: course[0],
        structured_report_count: course[1],
        overall_observed_mean_0_5: course[2],
        dimensions: Object.fromEntries(raw.dims.map((dimension, index) => [dimension, {
          observed_mean_0_5: course[3][index][0],
          sample_size: course[3][index][1]
        }])),
        latest_evidence_date: course[4]
      }))
    }))
  };

  const $ = selector => document.querySelector(selector);
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const unique = values => [...new Set(values.filter(Boolean))];
  const comparePersian = (left, right) => left.localeCompare(right, "fa");
  const fa = value => Number(value || 0).toLocaleString("fa-IR");
  const dimensions = {
    coherence: "پیوستگی تدریس",
    knowledge: "دانش عمومی",
    teaching: "انتقال مطالب",
    management: "مدیریت کلاس",
    responsiveness: "پاسخ‌گویی",
    behavior: "رفتار با دانشجو"
  };

  let limit = 30;
  let statusFilter = "all";
  let savedOnly = false;
  let previousFocus = null;

  function storageGet(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); }
    catch { /* Storage can be disabled by the browser. */ }
  }

  function loadSaved() {
    try {
      const parsed = JSON.parse(storageGet("ui_saved_professor_ids", "[]"));
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.map(Number).filter(Number.isSafeInteger));
    } catch {
      return new Set();
    }
  }

  const saved = loadSaved();

  function normalize(value = "") {
    return String(value).toLowerCase()
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/[ۀة]/g, "ه")
      .replace(/[\u064b-\u065f\u0670]/g, "")
      .replace(/[۰-۹]/g, character => String(character.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, character => String(character.charCodeAt(0) - 1632))
      .replace(/[\u200c\u200d]/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
    return date;
  }

  function formatDate(value) {
    const date = validDate(value);
    return date ? new Intl.DateTimeFormat("fa-IR", {
      year: "numeric", month: "short", day: "numeric", timeZone: "UTC"
    }).format(date) : "—";
  }

  function officialURL(value) {
    try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase();
      return url.protocol === "https:" && !url.username && !url.password &&
        (hostname === "ui.ac.ir" || hostname.endsWith(".ui.ac.ir")) ? url.href : null;
    } catch {
      return null;
    }
  }

  function fillSelect(element, values, placeholder) {
    const existing = element.value;
    const valid = unique(values).sort(comparePersian);
    element.replaceChildren(new Option(placeholder, ""));
    for (const value of valid) element.add(new Option(value, value));
    if (valid.includes(existing)) element.value = existing;
  }

  const reports = professor => Number(professor.review_coverage.structured_evidence_count) || 0;

  function validScore(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5;
  }

  function professorRating(professor) {
    let weightedTotal = 0;
    let weight = 0;
    for (const course of professor.courses) {
      const count = Number(course.structured_report_count) || 0;
      if (count <= 0 || !validScore(course.overall_observed_mean_0_5)) continue;
      weightedTotal += course.overall_observed_mean_0_5 * count;
      weight += count;
    }
    return weight ? weightedTotal / weight : null;
  }

  function professorDimension(professor, dimension) {
    let weightedTotal = 0;
    let weight = 0;
    for (const course of professor.courses) {
      const current = course.dimensions?.[dimension];
      const count = Number(current?.sample_size) || 0;
      if (count <= 0 || !validScore(current?.observed_mean_0_5)) continue;
      weightedTotal += current.observed_mean_0_5 * count;
      weight += count;
    }
    return { score: weight ? weightedTotal / weight : null, sampleSize: weight };
  }

  function latestDate(professor) {
    return professor.courses.map(course => course.latest_evidence_date)
      .filter(value => validDate(value)).sort().at(-1) || null;
  }

  function searchable(professor) {
    return normalize([
      professor.name_fa,
      professor.academic_rank,
      professor.faculty,
      professor.department,
      ...professor.courses.map(course => course.course)
    ].join(" "));
  }

  function cascadeDepartment() {
    const faculty = $("#faculty").value;
    const pool = data.professors.filter(professor => !faculty || professor.faculty === faculty);
    fillSelect($("#department"), pool.map(professor => professor.department), "همه گروه‌ها");
  }

  function filtered() {
    const query = normalize($("#q").value).split(" ").filter(Boolean);
    const faculty = $("#faculty").value;
    const department = $("#department").value;
    const academicRank = $("#rank").value;

    const result = data.professors.filter(professor => {
      if (query.length) {
        const text = searchable(professor);
        const compact = text.replace(/\s+/g, "");
        if (!query.every(word => text.includes(word) || compact.includes(word))) return false;
      }
      if (faculty && professor.faculty !== faculty) return false;
      if (department && professor.department !== department) return false;
      if (academicRank && professor.academic_rank !== academicRank) return false;
      if (savedOnly && !saved.has(professor.id)) return false;

      const rating = professorRating(professor);
      if (statusFilter === "rated" && rating === null) return false;
      if (statusFilter === "none" && rating !== null) return false;
      return true;
    });

    const selectedSort = $("#sort").value;
    if (selectedSort === "name") {
      result.sort((left, right) => comparePersian(left.name_fa, right.name_fa));
    } else if (selectedSort === "reviews") {
      result.sort((left, right) => reports(right) - reports(left) ||
        (professorRating(right) ?? -1) - (professorRating(left) ?? -1) ||
        comparePersian(left.name_fa, right.name_fa));
    } else {
      result.sort((left, right) => (professorRating(right) ?? -1) - (professorRating(left) ?? -1) ||
        reports(right) - reports(left) || comparePersian(left.name_fa, right.name_fa));
    }
    return result;
  }

  function scoreClass(score) {
    if (score === null) return "";
    if (score >= 4) return "good";
    if (score >= 3) return "mid";
    return "low";
  }

  function formatScore(score) {
    return score === null ? "—" : score.toLocaleString("fa-IR", { maximumFractionDigits: 2 });
  }

  function cardHTML(professor) {
    const score = professorRating(professor);
    const count = reports(professor);
    return `<article class="card"><div class="card-main" role="button" tabindex="0" data-open-id="${professor.id}" aria-label="مشاهدهٔ جزئیات ${escapeHTML(professor.name_fa)}"><div class="card-head"><div class="person"><div class="name">${escapeHTML(professor.name_fa)}</div><div class="faculty">${escapeHTML(professor.faculty || "دانشکده نامشخص")}</div></div><div class="score-ring ${scoreClass(score)}" style="--p:${score === null ? 0 : Math.max(0, Math.min(100, score * 20))}"><div class="score-val">${formatScore(score)}<small>${score === null ? "بدون امتیاز" : "از ۵"}</small></div></div></div><div class="badges"><span class="badge">${escapeHTML(professor.academic_rank || "مرتبه نامشخص")}</span><span class="badge">${escapeHTML(professor.department || "گروه نامشخص")}</span></div><div class="courses">${score === null ? "هنوز امتیازی برای این استاد ثبت نشده است." : "امتیاز کلی بر اساس بازخوردهای ثبت‌شده برای این استاد"}</div><div class="signal"><div><span class="signal-label">بازخورد</span><span>${fa(count)}</span></div><div><span class="signal-label">آخرین بازخورد</span><span>${formatDate(latestDate(professor))}</span></div></div></div><div class="card-foot"><div class="card-actions"><button class="mini-btn ${saved.has(professor.id) ? "on" : ""}" data-save-id="${professor.id}" aria-pressed="${saved.has(professor.id)}">★ ذخیره</button></div><button class="details-link" data-open-id="${professor.id}">جزئیات ←</button></div></article>`;
  }

  function bindOpen() {
    for (const element of document.querySelectorAll("[data-open-id]")) {
      element.onclick = () => openProfessor(Number(element.dataset.openId));
      if (element.getAttribute("role") === "button") {
        element.onkeydown = event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProfessor(Number(element.dataset.openId));
          }
        };
      }
    }
  }

  function bindActions() {
    bindOpen();
    for (const element of document.querySelectorAll("[data-save-id]")) {
      element.onclick = event => {
        event.stopPropagation();
        toggleSave(Number(element.dataset.saveId));
      };
    }
  }

  function render() {
    const result = filtered();
    $("#resultCount").textContent = `${fa(result.length)} نتیجه از ${fa(data.stats.professors)} استاد رسمی`;
    $("#cards").innerHTML = result.slice(0, limit).map(cardHTML).join("") ||
      '<div class="empty">با این فیلترها نتیجه‌ای پیدا نشد.</div>';
    $("#loadMore").style.display = result.length > limit ? "block" : "none";
    $("#savedToggle").classList.toggle("on", savedOnly);
    $("#savedToggle").setAttribute("aria-pressed", String(savedOnly));
    $("#savedToggle").textContent = savedOnly ? "★ نمایش همه" : "★ ذخیره‌شده‌ها";
    $("#savedCheck").checked = savedOnly;
    bindActions();
  }

  function renderReliable() {
    const selected = [...data.professors]
      .filter(professor => professorRating(professor) !== null && reports(professor) >= 3)
      .sort((left, right) => professorRating(right) - professorRating(left) ||
        reports(right) - reports(left) || comparePersian(left.name_fa, right.name_fa))
      .slice(0, 4);

    $("#reliableGrid").innerHTML = selected.map(professor => {
      const score = professorRating(professor);
      return `<article class="reliable" role="button" tabindex="0" data-open-id="${professor.id}" aria-label="مشاهدهٔ جزئیات ${escapeHTML(professor.name_fa)}"><div class="reliable-top"><div><div class="reliable-name">${escapeHTML(professor.name_fa)}</div><div class="reliable-faculty">${escapeHTML(professor.faculty || "")}</div></div><div class="reliable-score">${formatScore(score)}</div></div><div class="reliable-meta">امتیاز از ۵ • ${fa(reports(professor))} بازخورد</div></article>`;
    }).join("") || '<div class="empty">فعلاً استادی با حداقل ۳ بازخورد و امتیاز قابل نمایش وجود ندارد.</div>';
    bindOpen();
  }

  function toggleSave(id) {
    saved.has(id) ? saved.delete(id) : saved.add(id);
    storageSet("ui_saved_professor_ids", JSON.stringify([...saved]));
    render();
    if ($("#drawer").classList.contains("open") && Number($("#drawer").dataset.pid) === id) {
      openProfessor(id, false, false);
    }
  }

  function dimensionHTML(professor) {
    return Object.entries(dimensions).map(([key, label]) => {
      const current = professorDimension(professor, key);
      return `<div class="dim"><div class="dim-top"><span>${escapeHTML(label)}${current.sampleSize ? `<small> · ${fa(current.sampleSize)} بازخورد</small>` : ""}</span><b>${formatScore(current.score)}</b></div><div class="track"><i style="width:${current.score === null ? 0 : Math.max(0, Math.min(100, current.score * 20))}%"></i></div></div>`;
    }).join("");
  }

  function openProfessor(id, push = true, captureFocus = true) {
    const professor = data.professors.find(value => value.id === id);
    if (!professor) return;
    if (captureFocus && !$("#drawer").classList.contains("open")) previousFocus = document.activeElement;

    const score = professorRating(professor);
    const url = officialURL(professor.official_profile_url);
    $("#drawer").dataset.pid = String(id);
    $("#dName").textContent = professor.name_fa;
    $("#dMeta").textContent = [professor.academic_rank, professor.faculty, professor.department].filter(Boolean).join(" • ");
    $("#drawerBody").innerHTML = `<div class="profile-top"><div class="profile-score"><b>${formatScore(score)}</b><span>${score === null ? "بدون امتیاز" : "امتیاز کلی از ۵"}</span></div><div class="profile-actions"><button class="mini-btn ${saved.has(id) ? "on" : ""}" data-save-id="${id}" aria-pressed="${saved.has(id)}">★ ذخیره</button></div></div><div class="badges"><span class="badge">${fa(reports(professor))} بازخورد</span><span class="badge">آخرین بازخورد: ${formatDate(latestDate(professor))}</span></div>${url ? `<p><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">پروفایل رسمی دانشگاه ↗</a></p>` : ""}<h3 class="course-heading">شاخص‌های کلی استاد</h3><div class="dims">${dimensionHTML(professor)}</div><div class="callout profile-callout">امتیاز کلی و شاخص‌ها از تجمیع بازخوردهای ثبت‌شده برای خود استاد محاسبه می‌شوند. برای تفسیر بهتر، تعداد بازخورد را هم کنار امتیاز در نظر بگیرید.</div>`;
    $("#drawer").classList.add("open");
    $("#drawerBackdrop").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");
    bindActions();
    if (captureFocus) $("#drawerClose").focus();
    if (push) history.replaceState(null, "", `#professor=${professor.id}`);
  }

  function closeDrawer(restore = true) {
    if (!$("#drawer").classList.contains("open")) return;
    $("#drawer").classList.remove("open");
    $("#drawerBackdrop").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
    if (location.hash.startsWith("#professor=")) history.replaceState(null, "", location.pathname + location.search);
    if (restore && previousFocus?.isConnected) previousFocus.focus();
  }

  function containFocus(event) {
    if (event.key !== "Tab" || !$("#drawer").classList.contains("open")) return;
    const root = $("#drawer");
    const focusable = [...root.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(element => element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      root.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  function resetFilters() {
    statusFilter = "all";
    savedOnly = false;
    limit = 30;
    for (const id of ["q", "heroQ", "faculty", "department", "rank"]) $("#" + id).value = "";
    $("#sort").value = "rating";
    $("#savedCheck").checked = false;
    for (const chip of document.querySelectorAll(".chip")) {
      const active = chip.dataset.status === "all";
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-pressed", String(active));
    }
    cascadeDepartment();
    render();
  }

  function applyTheme() {
    const theme = storageGet("ui_theme", document.documentElement.dataset.theme || "dark");
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  }

  function applyHash() {
    const match = location.hash.match(/^#professor=(\d+)$/);
    if (match) openProfessor(Number(match[1]), false);
  }

  $("#q").oninput = () => {
    limit = 30;
    $("#heroQ").value = $("#q").value;
    render();
  };
  $("#heroQ").oninput = () => {
    $("#q").value = $("#heroQ").value;
    limit = 30;
    render();
  };
  $("#faculty").onchange = () => { limit = 30; cascadeDepartment(); render(); };
  $("#department").onchange = () => { limit = 30; render(); };
  $("#rank").onchange = () => { limit = 30; render(); };
  $("#sort").onchange = () => { limit = 30; render(); };
  $("#loadMore").onclick = () => { limit += 30; render(); };
  $("#clear").onclick = resetFilters;
  $("#savedToggle").onclick = () => { savedOnly = !savedOnly; limit = 30; render(); };
  $("#savedCheck").onchange = event => { savedOnly = event.target.checked; limit = 30; render(); };
  $("#themeBtn").onclick = () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    storageSet("ui_theme", theme);
  };
  $("#drawerClose").onclick = () => closeDrawer();
  $("#drawerBackdrop").onclick = () => closeDrawer();

  for (const chip of document.querySelectorAll(".chip")) {
    chip.setAttribute("aria-pressed", String(chip.classList.contains("active")));
    chip.onclick = () => {
      for (const current of document.querySelectorAll(".chip")) {
        current.classList.remove("active");
        current.setAttribute("aria-pressed", "false");
      }
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");
      statusFilter = chip.dataset.status || "all";
      limit = 30;
      render();
    };
  }

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("#heroQ").focus();
    }
    if (event.key === "Escape") closeDrawer();
    containFocus(event);
  });
  window.addEventListener("hashchange", applyHash);

  const ratedProfessors = data.professors.filter(professor => professorRating(professor) !== null).length;
  const professorsWithThreeReviews = data.professors.filter(professor => reports(professor) >= 3).length;
  $("#mReviews").textContent = fa(data.stats.professors_with_any_public_evidence);
  $("#mProfessors").textContent = fa(data.stats.professors);
  $("#mFaculties").textContent = fa(data.stats.faculties);
  $("#mAvg").textContent = fa(data.stats.department_units);
  $("#mComplete").textContent = fa(ratedProfessors);
  $("#mCommunity").textContent = fa(professorsWithThreeReviews);

  fillSelect($("#faculty"), data.faculties, "همه دانشکده‌ها");
  fillSelect($("#rank"), data.professors.map(professor => professor.academic_rank), "همهٔ مرتبه‌ها");
  cascadeDepartment();
  applyTheme();
  renderReliable();
  render();
  applyHash();
  document.documentElement.dataset.appReady = "true";
  document.dispatchEvent(new Event("ui:data-ready"));
})().catch(error => {
  console.error(error);
  const cards = document.querySelector("#cards");
  if (cards) cards.textContent = "خطا در بارگذاری بانک داده. صفحه را دوباره باز کنید.";
  document.documentElement.classList.add("data-load-failed");
  document.dispatchEvent(new Event("ui:data-failed"));
});
