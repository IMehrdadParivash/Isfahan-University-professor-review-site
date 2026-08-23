/* V17 static public roster. Ratings exist only on professor × course pairs. */
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
        latest_evidence_date: course[4],
        ranking_eligible_under_proposed_policy: Boolean(course[5])
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
  const advancedIds = ["rank", "minReports", "freshness", "minRating", "dimension", "minDimension"];
  let limit = 30;
  let statusFilter = "all";
  let minimumEvidence = 0;
  let comparison = [];
  let savedOnly = false;
  let previousFocus = null;

  function storageGet(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); }
    catch { /* Browsers can legitimately disable storage. */ }
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

  function validCourse(value) {
    const trimmed = String(value || "").trim();
    return trimmed !== "" && trimmed !== "." && trimmed !== ".." &&
      !/^[0-9۰-۹٠-٩]+$/.test(trimmed);
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
  const rankable = professor => Number(professor.review_coverage.cautiously_rankable_course_pair_count) > 0;
  const courseScore = course => course.structured_report_count >= 2 &&
    typeof course.overall_observed_mean_0_5 === "number" &&
    course.overall_observed_mean_0_5 >= 0 && course.overall_observed_mean_0_5 <= 5
    ? course.overall_observed_mean_0_5 : null;

  function dimensionScore(course, dimension) {
    const value = course.dimensions?.[dimension];
    return value?.sample_size >= 2 && typeof value.observed_mean_0_5 === "number" &&
      value.observed_mean_0_5 >= 0 && value.observed_mean_0_5 <= 5
      ? value.observed_mean_0_5 : null;
  }

  function latestDate(professor) {
    return professor.courses.map(course => course.latest_evidence_date)
      .filter(date => validDate(date)).sort().at(-1) || null;
  }

  function searchable(professor) {
    // The verified compact V17 dataset contains no English names or aliases.
    return normalize([professor.name_fa, professor.academic_rank, professor.faculty,
      professor.department, ...professor.courses.map(course => course.course)].join(" "));
  }

  function cascade(change = "faculty") {
    const faculty = $("#faculty").value;
    const facultyPool = data.professors.filter(professor => !faculty || professor.faculty === faculty);
    if (change === "faculty") {
      fillSelect($("#department"), facultyPool.map(professor => professor.department), "همه گروه‌ها");
    }
    const department = $("#department").value;
    const departmentPool = facultyPool.filter(professor => !department || professor.department === department);
    const canonical = new Map();
    for (const professor of departmentPool) {
      for (const course of professor.courses) {
        if (validCourse(course.course)) {
          const normalized = normalize(course.course);
          if (normalized && !canonical.has(normalized)) canonical.set(normalized, course.course.trim());
        }
      }
    }
    fillSelect($("#course"), [...canonical.values()], "همه درس‌ها");
  }

  function matchingCourses(professor, selectedCourse) {
    if (!selectedCourse) return professor.courses.filter(course => validCourse(course.course));
    const selected = normalize(selectedCourse);
    return professor.courses.filter(course => validCourse(course.course) && normalize(course.course) === selected);
  }

  function withinYears(course, years) {
    const date = validDate(course.latest_evidence_date);
    if (!date) return false;
    const minimum = new Date();
    minimum.setUTCFullYear(minimum.getUTCFullYear() - years);
    return date >= minimum;
  }

  function filtered() {
    const query = normalize($("#q").value).split(" ").filter(Boolean);
    const faculty = $("#faculty").value;
    const department = $("#department").value;
    const course = $("#course").value;
    const academicRank = $("#rank").value;
    const minimumReports = Number($("#minReports").value || 0);
    const freshness = Number($("#freshness").value || 0);
    const minimumRating = Number($("#minRating").value || 0);
    const dimension = $("#dimension").value;
    const minimumDimension = Number($("#minDimension").value || 0);
    const needsCourse = Boolean(course || freshness || minimumRating || dimension || minimumDimension);

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
      if (reports(professor) < minimumEvidence) return false;
      if (statusFilter === "evidence" && !professor.review_coverage.has_any_public_evidence) return false;
      if (statusFilter === "rankable" && !rankable(professor)) return false;
      if (statusFilter === "none" && professor.review_coverage.has_any_public_evidence) return false;

      const courses = matchingCourses(professor, course);
      if (course && !courses.length) return false;
      if (!needsCourse) return reports(professor) >= minimumReports;

      return courses.some(candidate => {
        if (candidate.structured_report_count < minimumReports) return false;
        if (freshness && !withinYears(candidate, freshness)) return false;
        if (minimumRating && (courseScore(candidate) === null || courseScore(candidate) < minimumRating)) return false;
        if (dimension && dimensionScore(candidate, dimension) === null) return false;
        if (minimumDimension) {
          if (dimension) return dimensionScore(candidate, dimension) >= minimumDimension;
          return Object.keys(dimensions).some(key => {
            const score = dimensionScore(candidate, key);
            return score !== null && score >= minimumDimension;
          });
        }
        return true;
      });
    });

    const selectedSort = $("#sort").value;
    if (selectedSort === "rankable") {
      result.sort((left, right) => right.review_coverage.cautiously_rankable_course_pair_count -
        left.review_coverage.cautiously_rankable_course_pair_count || reports(right) - reports(left));
    } else if (selectedSort === "name") {
      result.sort((left, right) => comparePersian(left.name_fa, right.name_fa));
    } else {
      result.sort((left, right) => reports(right) - reports(left) ||
        right.review_coverage.course_pair_count - left.review_coverage.course_pair_count ||
        comparePersian(left.name_fa, right.name_fa));
    }
    return result;
  }

  function evidenceLabel(professor) {
    if (!professor.review_coverage.has_any_public_evidence) return "هنوز داده‌ای ندارد";
    if (rankable(professor)) return "پشتوانه بهتر";
    return reports(professor) >= 3 ? "داده موجود، اما محدود یا قدیمی" : "نمونه محدود";
  }

  function cardHTML(professor) {
    const count = reports(professor);
    const eligible = professor.review_coverage.cautiously_rankable_course_pair_count || 0;
    const courseNames = professor.courses.filter(course => validCourse(course.course))
      .slice(0, 5).map(course => course.course).join("، ");
    return `<article class="card"><div class="card-main" role="button" tabindex="0" data-open-id="${professor.id}" aria-label="مشاهدهٔ جزئیات ${escapeHTML(professor.name_fa)}"><div class="card-head"><div class="person"><div class="name">${escapeHTML(professor.name_fa)}</div><div class="faculty">${escapeHTML(professor.faculty || "دانشکده نامشخص")}</div></div><div class="score-ring ${eligible ? "good" : count >= 3 ? "mid" : ""}" style="--p:${Math.min(100, count * 10)}"><div class="score-val">${fa(count)}<small>گزارش</small></div></div></div><div class="badges"><span class="badge">${escapeHTML(professor.academic_rank || "مرتبه نامشخص")}</span><span class="badge">${escapeHTML(professor.department || "گروه نامشخص")}</span><span class="badge ${eligible ? "strong" : !professor.review_coverage.has_any_public_evidence ? "warn" : ""}">${escapeHTML(evidenceLabel(professor))}</span></div><div class="courses">${escapeHTML(courseNames || "هنوز درس دارای بازخورد ثبت نشده")}</div><div class="signal"><div><span class="signal-label">درس با پشتوانه بهتر</span><span>${fa(eligible)}</span></div><div><span class="signal-label">آخرین شاهد</span><span>${formatDate(latestDate(professor))}</span></div></div></div><div class="card-foot"><div class="card-actions"><button class="mini-btn ${saved.has(professor.id) ? "on" : ""}" data-save-id="${professor.id}" aria-pressed="${saved.has(professor.id)}">★ ذخیره</button><button class="mini-btn ${comparison.includes(professor.id) ? "on" : ""}" data-compare-id="${professor.id}" aria-pressed="${comparison.includes(professor.id)}">⇄ مقایسه</button></div><button class="details-link" data-open-id="${professor.id}">جزئیات ←</button></div></article>`;
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
    for (const element of document.querySelectorAll("[data-compare-id]")) {
      element.onclick = event => {
        event.stopPropagation();
        toggleCompare(Number(element.dataset.compareId));
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
    const selected = [...data.professors].filter(rankable)
      .sort((left, right) => right.review_coverage.cautiously_rankable_course_pair_count -
        left.review_coverage.cautiously_rankable_course_pair_count || reports(right) - reports(left) ||
        comparePersian(left.name_fa, right.name_fa)).slice(0, 4);
    $("#reliableGrid").innerHTML = selected.map(professor => `<article class="reliable" role="button" tabindex="0" data-open-id="${professor.id}" aria-label="مشاهدهٔ جزئیات ${escapeHTML(professor.name_fa)}"><div class="reliable-top"><div><div class="reliable-name">${escapeHTML(professor.name_fa)}</div><div class="reliable-faculty">${escapeHTML(professor.faculty || "")}</div></div><div class="reliable-score">${fa(professor.review_coverage.cautiously_rankable_course_pair_count)}</div></div><div class="reliable-meta">${fa(reports(professor))} گزارش ساختاریافته • ${fa(professor.review_coverage.cautiously_rankable_course_pair_count)} درس با پشتوانه بهتر</div></article>`).join("") ||
      '<div class="empty">فعلاً رکوردی با پشتوانهٔ کافی وجود ندارد.</div>';
  }

  function toggleSave(id) {
    saved.has(id) ? saved.delete(id) : saved.add(id);
    storageSet("ui_saved_professor_ids", JSON.stringify([...saved]));
    render();
    if ($("#drawer").classList.contains("open") && Number($("#drawer").dataset.pid) === id) {
      openProfessor(id, false, false);
    }
  }

  function toggleCompare(id) {
    if (comparison.includes(id)) comparison = comparison.filter(value => value !== id);
    else if (comparison.length < 3) comparison.push(id);
    else {
      alert("حداکثر ۳ استاد را هم‌زمان مقایسه کنید.");
      return;
    }
    render();
    updateComparison();
  }

  function updateComparison() {
    const professors = comparison.map(id => data.professors.find(professor => professor.id === id)).filter(Boolean);
    $("#compareNames").innerHTML = professors.map(professor => `<span class="ctag">${escapeHTML(professor.name_fa)}</span>`).join("");
    $("#compareBar").classList.toggle("show", comparison.length > 0);
    $("#compareGo").disabled = comparison.length < 2;
  }

  function dimensionHTML(course) {
    return Object.entries(dimensions).map(([key, label]) => {
      const current = course.dimensions?.[key] || {};
      const value = dimensionScore(course, key);
      return `<div class="dim"><div class="dim-top"><span>${escapeHTML(label)}<small> · n=${fa(current.sample_size || 0)}</small></span><b>${value === null ? "—" : value.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}</b></div><div class="track"><i style="width:${value === null ? 0 : Math.max(0, Math.min(100, value * 20))}%"></i></div></div>`;
    }).join("");
  }

  function courseHTML(course) {
    const count = course.structured_report_count || 0;
    const score = courseScore(course);
    const eligible = course.ranking_eligible_under_proposed_policy;
    const label = validCourse(course.course) ? course.course : "درس نامشخص";
    return `<article class="review"><div class="rhead"><b>${escapeHTML(label)}</b><span class="rscore">${score === null ? "داده عددی ناکافی" : `${score.toLocaleString("fa-IR", { maximumFractionDigits: 2 })} / ۵`}</span></div><div class="badges"><span class="badge ${eligible ? "strong" : count < 2 ? "warn" : ""}">${fa(count)} گزارش</span><span class="badge">آخرین شاهد: ${formatDate(course.latest_evidence_date)}</span><span class="badge">${eligible ? "واجد شرایط مقایسه" : "برای مقایسهٔ معتبر کافی نیست"}</span></div>${count >= 2 ? `<div class="dims">${dimensionHTML(course)}</div>` : ""}<div class="note">${eligible ? "این درس حداقل ۳ گزارش ساختاریافته دارد و آخرین شاهد آن حداکثر ۳ سال قدمت دارد." : "این درس پشتوانهٔ کافی برای رتبه‌بندی ندارد؛ تعداد گزارش و تازگی را در تفسیر لحاظ کنید."}</div></article>`;
  }

  function openProfessor(id, push = true, captureFocus = true) {
    const professor = data.professors.find(value => value.id === id);
    if (!professor) return;
    if (captureFocus && !$("#drawer").classList.contains("open")) previousFocus = document.activeElement;
    $("#drawer").dataset.pid = String(id);
    $("#dName").textContent = professor.name_fa;
    $("#dMeta").textContent = [professor.academic_rank, professor.faculty, professor.department].filter(Boolean).join(" • ");
    const courses = [...professor.courses]
      .sort((left, right) => Number(right.ranking_eligible_under_proposed_policy) -
        Number(left.ranking_eligible_under_proposed_policy) || right.structured_report_count -
        left.structured_report_count || (right.latest_evidence_date || "").localeCompare(left.latest_evidence_date || ""));
    const url = officialURL(professor.official_profile_url);
    $("#drawerBody").innerHTML = `<div class="profile-top"><div class="profile-score"><b>${fa(reports(professor))}</b><span>گزارش ساختاریافته</span></div><div class="profile-actions"><button class="mini-btn ${saved.has(id) ? "on" : ""}" data-save-id="${id}" aria-pressed="${saved.has(id)}">★ ذخیره</button><button class="mini-btn ${comparison.includes(id) ? "on" : ""}" data-compare-id="${id}" aria-pressed="${comparison.includes(id)}">⇄ مقایسه</button></div></div><div class="callout profile-callout"><b>امتیاز کلی استاد نمایش داده نمی‌شود.</b><br>امتیازها فقط در سطح هر درس و همراه با تعداد گزارش و تازگی شواهد نمایش داده می‌شوند.</div><div class="badges"><span class="badge">${fa(professor.review_coverage.course_pair_count)} درس دارای شاهد</span><span class="badge">${fa(professor.review_coverage.cautiously_rankable_course_pair_count)} درس با پشتوانه بهتر</span><span class="badge">${fa(professor.review_coverage.qualitative_chat_evidence_count)} شاهد کیفی</span></div>${url ? `<p><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">پروفایل رسمی دانشگاه ↗</a></p>` : ""}<h3 class="course-heading">دادهٔ استاد × درس</h3>${courses.length ? courses.map(courseHTML).join("") : '<div class="empty">برای این عضو فعلی دانشگاه هنوز دادهٔ استاد × درس قابل‌استفاده ثبت نشده است.</div>'}`;
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

  function comparisonHTML(professor, commonCourses, comparableCourses) {
    const selected = professor.courses.filter(course => commonCourses.has(normalize(course.course)))
      .sort((left, right) => comparePersian(left.course, right.course));
    return `<section class="compare-col"><h3>${escapeHTML(professor.name_fa)}</h3><p class="muted">${escapeHTML([professor.academic_rank, professor.faculty, professor.department].filter(Boolean).join(" • "))}</p><div class="badges"><span class="badge">${fa(reports(professor))} گزارش</span><span class="badge strong">${fa(professor.review_coverage.cautiously_rankable_course_pair_count)} درس قابل مقایسه</span></div><div class="comparison-courses">${selected.map(course => {
      const score = courseScore(course);
      const eligible = course.ranking_eligible_under_proposed_policy && score !== null &&
        comparableCourses.has(normalize(course.course));
      return `<div class="mix"><h4>${escapeHTML(course.course)}</h4><div class="mix-tags"><span>${eligible ? `${score.toLocaleString("fa-IR", { maximumFractionDigits: 2 })} / ۵` : "شرایط مقایسهٔ عددی کافی نیست"}</span><span>${fa(course.structured_report_count)} گزارش</span><span>${formatDate(course.latest_evidence_date)}</span><span>${eligible ? "مقایسه‌پذیر" : "مقایسه‌ناپذیر"}</span></div></div>`;
    }).join("") || '<div class="empty">درس مشترک تأییدشده‌ای پیدا نشد.</div>'}</div></section>`;
  }

  function showComparison() {
    const professors = comparison.map(id => data.professors.find(professor => professor.id === id)).filter(Boolean);
    if (professors.length < 2) return;
    previousFocus = document.activeElement;
    if ($("#drawer").classList.contains("open")) closeDrawer(false);
    const counts = new Map();
    for (const professor of professors) {
      for (const course of new Set(professor.courses.filter(value => validCourse(value.course)).map(value => normalize(value.course)))) {
        counts.set(course, (counts.get(course) || 0) + 1);
      }
    }
    const common = new Set([...counts].filter(([, count]) => count >= 2).map(([course]) => course));
    const selected = $("#course").value;
    if (selected) {
      const normalized = normalize(selected);
      const shared = common.has(normalized);
      common.clear();
      if (shared) common.add(normalized);
    }
    const eligibleCounts = new Map();
    for (const professor of professors) {
      const eligible = new Set(professor.courses.filter(course =>
        course.ranking_eligible_under_proposed_policy && courseScore(course) !== null)
        .map(course => normalize(course.course)));
      for (const course of eligible) eligibleCounts.set(course, (eligibleCounts.get(course) || 0) + 1);
    }
    const comparable = new Set([...common].filter(course => (eligibleCounts.get(course) || 0) >= 2));
    $("#compareBody").innerHTML = `<div class="compare-grid">${professors.map(professor => comparisonHTML(professor, common, comparable)).join("")}</div><div class="callout comparison-note">${common.size ? "مقایسه فقط برای درس‌های مشترک انجام می‌شود. عدد تنها وقتی نمایش داده می‌شود که حداقل دو استاد در همان درس هرکدام ۳ گزارش و شواهد تازه داشته باشند." : "میان استادان انتخاب‌شده درس مشترک تأییدشده وجود ندارد؛ مقایسهٔ عددی معتبر نیست."}</div>`;
    $("#compareModal").classList.add("open");
    $("#compareModal").setAttribute("aria-hidden", "false");
    $("#compareClose").focus();
  }

  function closeComparison() {
    if (!$("#compareModal").classList.contains("open")) return;
    $("#compareModal").classList.remove("open");
    $("#compareModal").setAttribute("aria-hidden", "true");
    if (previousFocus?.isConnected) previousFocus.focus();
  }

  function containFocus(event) {
    if (event.key !== "Tab") return;
    const root = $("#compareModal").classList.contains("open") ? $("#compareModal .modal") :
      $("#drawer").classList.contains("open") ? $("#drawer") : null;
    if (!root) return;
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
    minimumEvidence = 0;
    savedOnly = false;
    limit = 30;
    for (const id of ["q", "heroQ", "faculty", "department", "course", ...advancedIds]) $("#" + id).value = "";
    $("#sort").value = "reviews";
    $("#savedCheck").checked = false;
    for (const chip of document.querySelectorAll(".chip")) {
      const active = chip.dataset.status === "all";
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-pressed", String(active));
    }
    cascade("faculty");
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
  $("#faculty").onchange = () => { limit = 30; cascade("faculty"); render(); };
  $("#department").onchange = () => { limit = 30; cascade("department"); render(); };
  for (const id of ["course", "sort", ...advancedIds]) {
    $("#" + id).onchange = () => { limit = 30; render(); };
  }
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
  $("#compareGo").onclick = showComparison;
  $("#compareClose").onclick = closeComparison;
  $("#compareModal").onclick = event => { if (event.target === $("#compareModal")) closeComparison(); };

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
      minimumEvidence = Number(chip.dataset.min || 0);
      limit = 30;
      render();
    };
  }

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("#heroQ").focus();
    }
    if (event.key === "Escape") {
      if ($("#compareModal").classList.contains("open")) closeComparison();
      else closeDrawer();
    }
    containFocus(event);
  });
  window.addEventListener("hashchange", applyHash);

  $("#mReviews").textContent = fa(data.stats.professors_with_any_public_evidence);
  $("#mProfessors").textContent = fa(data.stats.professors);
  $("#mFaculties").textContent = fa(data.stats.faculties);
  $("#mAvg").textContent = fa(data.stats.department_units);
  $("#mComplete").textContent = fa(data.stats.current_professor_course_pairs);
  $("#mCommunity").textContent = fa(data.stats.cautiously_rankable_course_pairs);
  fillSelect($("#faculty"), data.faculties, "همه دانشکده‌ها");
  fillSelect($("#rank"), data.professors.map(professor => professor.academic_rank), "همهٔ مرتبه‌ها");
  cascade("faculty");
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
