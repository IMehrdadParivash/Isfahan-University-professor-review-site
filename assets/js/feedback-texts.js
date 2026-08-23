/* Sanitized student-feedback excerpts with confirmed current-roster identity matches.
   Source wording may be lightly normalized for readability and privacy. These excerpts never affect numeric ratings. */
(() => {
  const FEEDBACK_BY_PROFESSOR_ID = Object.freeze({
    "109": [
      "دانش خانواده با استاد حوریه ربانی من باهاشون داشتم؛ خیلی عالی بودن."
    ],
    "122": [
      "اصلاً خوب نمره نمی‌ده؛ سر کلاس هم باید تقریباً همیشه حاضر باشی."
    ],
    "124": [
      "برای انقلاب فقط استاد عزیزخانی رو می‌شناسم؛ تو نمره دادن خوبن."
    ],
    "130": [
      "یه مقدار سخت‌گیرن به نظرم.",
      "عالیه."
    ],
    "131": [
      "عالیه."
    ],
    "313": [
      "استاد ترکی عالی هستن."
    ]
  });

  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function feedbackFor(id) {
    const value = FEEDBACK_BY_PROFESSOR_ID[String(id)];
    return Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()) : [];
  }

  function inject() {
    const drawer = document.querySelector("#drawer");
    const body = document.querySelector("#drawerBody");
    if (!drawer || !body || !drawer.classList.contains("open")) return;

    const professorId = drawer.dataset.pid || "";
    const items = feedbackFor(professorId);
    const existing = body.querySelector("[data-feedback-texts]");
    if (!items.length) {
      if (existing) existing.remove();
      return;
    }
    if (existing?.dataset.feedbackFor === professorId) return;
    if (existing) existing.remove();

    const section = document.createElement("section");
    section.className = "community-section";
    section.dataset.feedbackTexts = "true";
    section.dataset.feedbackFor = professorId;
    section.innerHTML = `<div class="community-head"><h3>متن بازخوردهای دانشجوها</h3><span class="community-badge">${items.length.toLocaleString("fa-IR")} مورد</span></div><div class="community-list">${items.map(text => `<article class="community-card"><div class="community-card-head"><span class="community-badge">بازخورد پالایش‌شده</span></div><div class="community-text">«${escapeHTML(text)}»</div></article>`).join("")}</div><div class="community-note">متن‌ها ناشناس‌اند و برای حذف اطلاعات شخصی، لحن نامناسب یا خطاهای واضح نگارشی ممکن است کمی پالایش شده باشند. این بازخوردهای متنی در محاسبهٔ امتیاز عددی استاد دخالت ندارند.</div>`;

    const qualitativeSummary = body.querySelector("[data-community-summary]");
    if (qualitativeSummary) body.insertBefore(section, qualitativeSummary);
    else body.append(section);
  }

  const body = document.querySelector("#drawerBody");
  if (body) new MutationObserver(() => queueMicrotask(inject)).observe(body, { childList: true });
  document.addEventListener("ui:data-ready", inject);
  document.addEventListener("click", event => {
    if (event.target.closest("[data-open-id]")) setTimeout(inject, 0);
  });
})();
