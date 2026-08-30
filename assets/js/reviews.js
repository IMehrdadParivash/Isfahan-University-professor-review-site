(() => {
  const API = "api/index.php?route=";
  const $ = selector => document.querySelector(selector);
  let csrf = "";
  let accountsEnabled = false;
  let activeProfessor = null;

  async function request(route, options = {}) {
    const response = await fetch(API + route, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || payload.error || "خطا در ارتباط با سرور");
      error.code = payload.error;
      throw error;
    }
    return payload;
  }

  async function ensureCsrf() {
    if (!csrf) {
      const metadata = await request("csrf");
      csrf = metadata.csrf;
      accountsEnabled = Boolean(metadata.accounts_enabled);
      const accountOption = $("#displayMode option[value=account]");
      if (accountOption && !accountsEnabled) accountOption.remove();
    }
    return csrf;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fa(value) { return Number(value || 0).toLocaleString("fa-IR"); }

  function reviewCard(review) {
    const article = element("article", "public-review");
    article.id = `review-${review.id}`;
    const head = element("div", "public-review-head");
    const author = element("div", "review-author");
    author.append(element("b", "", review.author_label || "دانشجوی ناشناس"));
    author.append(element("span", "", review.display_mode === "anonymous" ? "نظر ناشناس" : review.display_mode === "account" ? "حساب کاربری" : "نام نمایشی"));
    head.append(author, element("strong", "review-overall", `${fa(review.overall_score)} از ۵`));
    const body = element("p", "review-body", review.body);
    const meta = element("div", "review-meta");
    [review.course_name, review.term_label, review.recommended ? "پیشنهاد می‌کند" : "پیشنهاد نمی‌کند"].filter(Boolean).forEach(value => meta.append(element("span", "", value)));
    const actions = element("div", "review-actions");
    const helpful = element("button", "", `مفید بود · ${fa(Math.max(0, review.helpful_score))}`);
    const unhelpful = element("button", "", "مفید نبود");
    const report = element("button", "report-action", "گزارش تخلف");
    helpful.type = unhelpful.type = report.type = "button";
    helpful.onclick = () => vote(review.id, 1, helpful);
    unhelpful.onclick = () => vote(review.id, -1, helpful);
    report.onclick = () => reportReview(review.id);
    actions.append(helpful, unhelpful, report);
    article.append(head, body, meta, actions);
    return article;
  }

  async function loadReviews(id, sort = "newest", filters = {}) {
    const mount = $("#reviewExperience");
    if (!mount || Number(mount.dataset.professorId) !== id) return;
    mount.replaceChildren(element("div", "review-loading", "در حال دریافت تجربه‌های جدید…"));
    try {
      const parameters = new URLSearchParams({ professor_id: String(id), sort, page: String(filters.page || 1) });
      for (const key of ["course", "term", "rating", "recommended"]) if (filters[key] !== undefined && filters[key] !== "") parameters.set(key, filters[key]);
      const payload = await request(`reviews&${parameters.toString()}`);
      if (!$("#reviewExperience") || Number($("#reviewExperience").dataset.professorId) !== id) return;
      const header = element("div", "review-section-head");
      const title = element("div");
      title.append(element("h3", "", "تجربه‌های دانشجویان"), element("small", "", payload.stats ? `${fa(payload.stats.review_count)} نظر جدید` : "هنوز نظری در سامانهٔ جدید ثبت نشده"));
      const controls = element("div", "review-sort");
      const select = element("select");
      [["newest", "جدیدترین"], ["helpful", "مفیدترین"], ["highest", "بالاترین امتیاز"], ["lowest", "پایین‌ترین امتیاز"]].forEach(([value, label]) => select.add(new Option(label, value)));
      select.value = sort;
      select.onchange = () => loadReviews(id, select.value, { ...filters, page: 1 });
      const courseSelect = element("select");
      courseSelect.add(new Option("همهٔ درس‌ها", ""));
      (payload.filters?.courses || []).forEach(value => courseSelect.add(new Option(value, value)));
      courseSelect.value = filters.course || "";
      courseSelect.onchange = () => loadReviews(id, sort, { ...filters, course: courseSelect.value, page: 1 });
      const ratingSelect = element("select");
      ratingSelect.add(new Option("همهٔ امتیازها", ""));
      for (let score = 5; score >= 1; score--) ratingSelect.add(new Option(`${score} از ۵`, String(score)));
      ratingSelect.value = filters.rating || "";
      ratingSelect.onchange = () => loadReviews(id, sort, { ...filters, rating: ratingSelect.value, page: 1 });
      const termSelect = element("select");
      termSelect.add(new Option("همهٔ ترم‌ها", ""));
      (payload.filters?.terms || []).forEach(value => termSelect.add(new Option(value, value)));
      termSelect.value = filters.term || "";
      termSelect.onchange = () => loadReviews(id, sort, { ...filters, term: termSelect.value, page: 1 });
      const recommendSelect = element("select");
      recommendSelect.add(new Option("همهٔ پیشنهادها", ""));
      recommendSelect.add(new Option("پیشنهاد می‌کند", "1"));
      recommendSelect.add(new Option("پیشنهاد نمی‌کند", "0"));
      recommendSelect.value = filters.recommended ?? "";
      recommendSelect.onchange = () => loadReviews(id, sort, { ...filters, recommended: recommendSelect.value, page: 1 });
      const add = element("button", "primary-action", "ثبت تجربه");
      add.type = "button";
      add.onclick = () => openForm(id, activeProfessor?.name || "استاد");
      controls.append(select, courseSelect, termSelect, ratingSelect, recommendSelect, add);
      header.append(title, controls);
      const list = element("div", "public-review-list");
      if (payload.reviews.length) payload.reviews.forEach(review => list.append(reviewCard(review)));
      else list.append(element("div", "empty small-empty", "اولین تجربهٔ این استاد را ثبت کن."));
      const pagination = element("div", "review-pagination");
      if (payload.page > 1) {
        const previous = element("button", "", "صفحهٔ قبل");
        previous.onclick = () => loadReviews(id, sort, { ...filters, page: payload.page - 1 });
        pagination.append(previous);
      }
      if (payload.has_more) {
        const next = element("button", "", "صفحهٔ بعد");
        next.onclick = () => loadReviews(id, sort, { ...filters, page: payload.page + 1 });
        pagination.append(next);
      }
      mount.replaceChildren(header, list, pagination);
    } catch (error) {
      mount.replaceChildren(element("div", "review-offline", "ثبت و نمایش نظر پس از نصب دیتابیس روی هاست فعال می‌شود."));
    }
  }

  async function vote(reviewId, value, scoreButton) {
    try {
      await ensureCsrf();
      const result = await request("vote", { method: "POST", body: JSON.stringify({ review_id: reviewId, value, csrf }) });
      scoreButton.textContent = `مفید بود · ${fa(Math.max(0, result.score))}`;
    } catch (error) { scoreButton.title = error.message; }
  }

  async function reportReview(reviewId) {
    const reason = window.prompt("دلیل گزارش: privacy، threat، impersonation، spam، illegal یا other", "other");
    if (!reason) return;
    const details = window.prompt("توضیح کوتاه (اختیاری)", "") || "";
    try {
      await ensureCsrf();
      await request("report", { method: "POST", body: JSON.stringify({ review_id: reviewId, reason, details, csrf }) });
      window.alert("گزارش ثبت شد و برای بررسی مدیر ارسال شد.");
    } catch (error) { window.alert(error.message); }
  }

  async function correction(professorId) {
    const details = window.prompt("اطلاعات اشتباه و شکل درست آن را بنویس:", "");
    if (!details) return;
    try {
      await ensureCsrf();
      await request("change-request", { method: "POST", body: JSON.stringify({ professor_id: professorId, request_type: "correction", details, csrf }) });
      window.alert("درخواست اصلاح ثبت شد.");
    } catch (error) { window.alert(error.message); }
  }

  async function requestProfessor() {
    const details = window.prompt("نام کامل استاد، دانشکده/گروه و در صورت امکان لینک رسمی را بنویس:", "");
    if (!details) return;
    try {
      await ensureCsrf();
      await request("change-request", { method: "POST", body: JSON.stringify({ professor_id: null, request_type: "new_professor", details, csrf }) });
      window.alert("درخواست افزودن استاد ثبت شد.");
    } catch (error) { window.alert(error.message); }
  }

  async function shareProfessor(id, name) {
    const url = new URL(`professor.php?id=${id}`, location.href).href;
    if (navigator.share) {
      try { await navigator.share({ title: `${name} | امتیاز استادان`, url }); return; } catch { /* User cancelled. */ }
    }
    try { await navigator.clipboard.writeText(url); window.alert("لینک صفحهٔ استاد کپی شد."); }
    catch { window.prompt("لینک صفحهٔ استاد:", url); }
  }

  function openForm(id, name) {
    activeProfessor = { id, name };
    $("#reviewProfessorId").value = String(id);
    $("#reviewProfessorName").textContent = name;
    $("#reviewFeedback").textContent = "";
    $("#reviewModal").classList.add("open");
    $("#reviewModal").setAttribute("aria-hidden", "false");
    $("#reviewForm textarea").focus();
    ensureCsrf().catch(() => {});
  }

  function closeForm() {
    $("#reviewModal").classList.remove("open");
    $("#reviewModal").setAttribute("aria-hidden", "true");
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submitButton = form.querySelector("button[type=submit]");
    const feedback = $("#reviewFeedback");
    submitButton.disabled = true;
    feedback.textContent = "در حال ارسال…";
    const values = new FormData(form);
    const ratings = {};
    for (const [key, value] of values.entries()) if (key.startsWith("rating_") && value) ratings[key.slice(7)] = Number(value);
    const payload = {
      professor_id: Number(values.get("professor_id")), body: values.get("body"), course_name: values.get("course_name"),
      term_label: values.get("term_label"), course_type: values.get("course_type"), display_mode: values.get("display_mode"),
      display_name: values.get("display_name"), website: values.get("website"), recommended: values.get("recommended") === "true", ratings
    };
    try {
      await ensureCsrf();
      payload.csrf = csrf;
      const result = await request("reviews", { method: "POST", body: JSON.stringify(payload) });
      feedback.textContent = result.status === "published" ? "تجربه با موفقیت منتشر شد." : "تجربه ثبت شد و به‌دلیل نشانهٔ احتمالی تخلف در صف بررسی است.";
      form.reset();
      setTimeout(() => { closeForm(); loadReviews(payload.professor_id); }, 900);
    } catch (error) {
      const messages = { duplicate_review: "این تجربه یا ارسال دیگری از شما برای همین استاد اخیراً ثبت شده است.", rate_limited: "تعداد ارسال‌ها زیاد است؛ کمی بعد دوباره تلاش کن.", csrf_failed: "نشست منقضی شده؛ صفحه را تازه‌سازی کن." };
      feedback.textContent = messages[error.code] || error.message;
    } finally { submitButton.disabled = false; }
  }

  document.addEventListener("ui:professor-open", event => {
    activeProfessor = event.detail;
    loadReviews(event.detail.id);
    document.querySelectorAll("[data-review-id]").forEach(button => button.onclick = () => openForm(Number(button.dataset.reviewId), button.dataset.reviewName));
    document.querySelectorAll("[data-correction-id]").forEach(button => button.onclick = () => correction(Number(button.dataset.correctionId)));
    document.querySelectorAll("[data-share-id]").forEach(button => button.onclick = () => shareProfessor(Number(button.dataset.shareId), button.dataset.shareName));
  });
  $("#reviewClose").onclick = closeForm;
  $("#reviewModal").addEventListener("click", event => { if (event.target === $("#reviewModal")) closeForm(); });
  $("#displayMode").onchange = event => { $("#displayNameField").hidden = !["alias", "real_name"].includes(event.target.value); };
  $("#reviewForm").addEventListener("submit", submit);
  $("#requestProfessor").onclick = requestProfessor;
  document.addEventListener("keydown", event => { if (event.key === "Escape" && $("#reviewModal").classList.contains("open")) closeForm(); });
})();
