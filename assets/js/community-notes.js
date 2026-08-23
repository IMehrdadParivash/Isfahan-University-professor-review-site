/* Anonymized qualitative summaries from student-review threads supplied by the project owner.
   They supplement, but never change, the numeric professor rating. Raw usernames and verbatim chat are not published.
   Public attachment is conservative: surname-only mentions are not auto-matched to roster members. */
(() => {
  const RAW = [
    [["محمد ربانی خوراسگانی"],"mixed","medium","بازخوردها دربارهٔ مبانی میکروبیولوژی، منطق امتحان و اثر تکلیف‌ها بر یادگیری عمدتاً مثبت است. در مقابل، یک تجربهٔ مفصل از ایمنی زیستی حجم زیاد و پراکندگی مطالب را نقد کرده است؛ بنابراین تجربه می‌تواند بین درس‌ها متفاوت باشد."],
    [["گنجعلی خانی"],"positive","medium","تدریس و سطح امتحان مناسب و نمره‌دهی مطلوب توصیف شده است. حساسیت به حضور، تأخیر و استفاده از گوشی نیز گزارش شده است."],
    [["شیرین کشفی"],"positive","medium","تدریس آزمایشگاه، دانش علمی، رفتار با دانشجو و دقت در محاسبهٔ نمره مثبت ارزیابی شده است. گزارش‌کار و یادداشت‌برداری منظم برای نتیجهٔ بهتر مهم توصیف شده‌اند."],
    [["فرزانه ضوئی"],"positive","medium","تدریس منسجم و قابل‌فهم، رفتار محترمانه و تکلیف‌های کمک‌کننده به یادگیری از نقاط مثبت گزارش‌شده‌اند. مطالعهٔ دقیق محتوای ارائه‌شده برای امتحان توصیه شده است."],
    [["جوادی زرنقی"],"positive","low","برای بیوشیمی ساختار، کیفیت تدریس مثبت ارزیابی شده است. مطالعه در طول ترم و پاسخ تشریحی کامل، به‌ویژه رسم ساختارها، برای نتیجهٔ بهتر توصیه شده است."],
    [["جوادی راد"],"positive","low","در یک تجربه از ژنتیک پایه، تدریس خوب و ارفاق در نمره‌دهی گزارش شده است. به‌دلیل سنگینی درس، مطالعهٔ پیوسته در طول ترم توصیه شده است."],

    [["سمانه لطفی"],"positive","medium","رفتار همراه، توضیح جزئی، تخته‌نویسی منظم و ارتباط خوب با دانشجو مثبت ارزیابی شده است. حضور در کلاس مهم توصیف شده و یک دانشجو تجربهٔ دو ترم موفق را گزارش کرده است."],
    [["مالک عباسی"],"positive","low","در یک تجربه، تصحیح با ارفاق و توجه به روش حل حتی در صورت خطای جواب نهایی گزارش شده است."],
    [["مسعود سبزواری"],"mixed","medium","دانش علمی، رفتار و کیفیت تدریس بسیار مثبت ارزیابی شده‌اند، اما امتحان‌ها سخت توصیف شده‌اند."],
    [["فاطمه جعفری"],"positive","high","چند بازخورد مستقل بر آموزش کاربردی و مثال‌محور، مهربانی، دانش علمی، اهمیت‌دادن به یادگیری و نمره‌دهی منصفانه تأکید دارند. تکلیف‌ها نیز کمک‌کننده به نمره و یادگیری توصیف شده‌اند."],

    [["مهسا جلالی"],"positive","medium","تدریس و نمره‌دهی مثبت ارزیابی شده و حضور و غیاب دارای اثر مستقیم گزارش شده است. یک دانشجو افزایش محسوس نمرهٔ نهایی را نیز ذکر کرده است."],
    [["محمدرضا منصوری"],"positive","high","دو بازخورد مفصل، رفتار خوب، فضای غیرخسته‌کنندهٔ کلاس، امتحان قابل‌پیش‌بینی و ارفاق در نمره را مثبت ارزیابی کرده‌اند. فعالیت‌های داوطلبانه برای نمرهٔ اضافه نیز گزارش شده است."],
    [["فرشته احمدی"],"positive","medium","کلاس غیرخشک، رفتار مهربان، تدریس خوب و انعطاف در نمره‌دهی از نکات مثبت گزارش‌شده‌اند."],
    [["فاطمه یثربی"],"positive","medium","در یک تجربه، ارائه و مشارکت فعال در کلاس مسیر مناسبی برای گرفتن نمرهٔ بالا توصیف شده است."],
    [["محمدرضا رهنما"],"positive","medium","سخت‌گیری پایین، امتحان تستی و امکان فعالیت یا ارائهٔ اضافه برای بهبود نمره از نکات مثبت گزارش‌شده‌اند."],
    [["مریم حمصیان"],"mixed","medium","برای زبان، نمره‌دهی بد ارزیابی نشده اما یک دانشجو از خطاهای تلفظی و گرامری انتقاد کرده است. برای درس انقلاب نیز تجربه‌ای جداگانه ایشان را خوب و امتحان را تشریحی توصیف کرده است."],

    [["حشمت الله یاوری","حشمت اله یاوری","حشمت یاوری"],"mixed","medium","بخش عمدهٔ بازخوردها تدریس، رفتار، پاسخ‌گویی و نمره‌دهی را بسیار مثبت توصیف می‌کنند و یک بازخورد ماه‌ها بعد نیز کیفیت تدریس را تأیید کرده است. یک توصیهٔ منفی هم وجود دارد و تعداد زیادی از تعریف‌ها در بازهٔ زمانی بسیار کوتاه منتشر شده‌اند؛ بنابراین این بخش با احتیاط وزن‌دهی شده است."],
    [["ابراهیم قنبری"],"positive","medium","در چند توصیه برای فیزیک ۲ از ایشان به‌عنوان گزینهٔ خوب نام برده شده است؛ جزئیات دقیق‌تر دربارهٔ امتحان و نمره‌دهی محدود است."],
    [["نوربخش حبیب آبادی"],"negative","low","یک بازخورد قابل‌استفاده ایشان را سخت‌گیر توصیف کرده است. پیام‌های توهین‌آمیز یا فاقد جزئیات در این جمع‌بندی وارد نشده‌اند."],

    [["هادی امیری رودباری"],"mixed","medium","بازخوردهای زیادی بر احترام به دانشجو، پاسخ‌گویی، توضیح درس و نمره‌دهی مناسب تأکید دارند. در مقابل، یک تجربه از تأخیر در اعلام نمره و یک مخالفت مستقیم با توصیه‌های مثبت وجود دارد. بخش بزرگی از پیام‌های مثبت در بازهٔ زمانی کوتاهی منتشر شده‌اند، بنابراین با احتیاط تفسیر شده‌اند."],
    [["محسن مصلحی"],"positive","medium","دو اشارهٔ مستقل ایشان را در میان استادان بسیار خوب قرار داده‌اند، اما جزئیات روش تدریس و ارزیابی محدود است."],

    [["نشاط دوست","نشاط‌دوست"],"positive","low","در یک بازخورد، خوش‌اخلاقی و همراهی با دانشجو به‌عنوان نقطهٔ قوت مطرح شده است."],
    [["مریم اسماعیلی"],"positive","low","در یک بازخورد، تدریس و رفتار در کلاس بسیار مثبت ارزیابی شده است."],

    [["شیخی سینی"],"positive","medium","در چند بازهٔ زمانی جداگانه به‌عنوان گزینهٔ بسیار خوب برای تربیت بدنی توصیه شده است؛ جزئیات روش ارزیابی محدود است."],
    [["نسرین محمد صالحی"],"positive","medium","در یک تجربه، صمیمیت با دانشجو و سخت‌گیری پایین مثبت ارزیابی شده است."],
    [["رضوان عظیمی"],"negative","low","یک توصیهٔ منفی صریح برای درس ورزش ثبت شده است، اما توضیح جزئی دربارهٔ علت نارضایتی ارائه نشده است."],
    [["مرضیه رجالی"],"mixed","medium","تدریس مثبت ارزیابی شده و گفته شده با مطالعهٔ جزوه می‌توان نمرهٔ کامل گرفت. در عین حال نمره‌دهی بسیار دقیق و بدون گرد کردن حتی برای اعشار کوچک گزارش شده است."],

    [["هاشم زاده","هاشم‌زاده"],"positive","high","در چند دورهٔ زمانی و چند پیام مستقل به‌عنوان یکی از گزینه‌های بسیار خوب معارف توصیه شده است. فضای کلاس کم‌تنش و تجربهٔ کلی مثبت گزارش شده، هرچند جزئیات امتحان در همهٔ پیام‌ها یکسان نیست."],
    [["محسن شیراوند"],"positive","high","چند بازخورد در سال‌های مختلف ایشان را گزینهٔ خوب معارف دانسته‌اند. در یک تجربهٔ دو درس، هر دو نمرهٔ ۲۰ گزارش شده و فعالیت‌های اختیاری برای نمرهٔ اضافه نیز ذکر شده است."],
    [["بهاره اختری"],"mixed","medium","کیفیت تدریس مثبت گزارش شده، اما رفتار نوسانی و نمره‌دهی متوسط توصیف شده است. در آن تجربه، اگر هدف صرفاً نمره باشد استاد دیگری ترجیح داده شده است."],
    [["نصر اصفهانی"],"mixed","medium","اخلاق و فضای نسبتاً آزاد کلاس مثبت ارزیابی شده، اما همان تجربه کیفیت امتحان را چندان مطلوب ندانسته است."],
    [["جان نثاری","جان‌نثاری"],"positive","high","یک بازخورد مفصل و یک توصیهٔ جداگانه، رفتار بسیار همراه، امکان کسب نمرهٔ بالا و ساختار روشن نمره از تکلیف، حضور و امتحان را مثبت ارزیابی کرده‌اند."],
    [["زمانی خارایی"],"positive","medium","در بیش از یک پیام مستقل به‌عنوان گزینهٔ خوب معارف معرفی شده است؛ جزئیات روش تدریس و ارزیابی محدود است."],
    [["الهام آقادوستی","الهام اقا دوستی"],"mixed","medium","تدریس نسبتاً خوب، امکان نمرهٔ اضافه از جزوه و تحقیق، میان‌ترم و امتحان با سطح متوسط گزارش شده است. مشارکت در کلاس برای نمرهٔ بهتر مؤثر توصیف شده است."],
    [["نظر پور","نظرپور"],"positive","high","چند بازخورد مستقل، اخلاق، فضای کلاس و نمره‌دهی را مثبت ارزیابی کرده‌اند. حضور کامل و امتیازهای مازاد بر ۲۰ گزارش شده و یک دانشجو با وجود سخت‌تر شدن امتحان، نمرهٔ نهایی را خوب دانسته است."],
    [["داریوش محمدی"],"positive","high","یک دانشجو بر پایهٔ ۱۰ واحد در دو ترم، اخلاق، همراهی با دانشجو، سخت‌گیری پایین و نمره‌دهی را بسیار مثبت ارزیابی کرده است."],
    [["مرضیه شماعی"],"mixed","medium","با وجود شنیده‌های منفی اولیه، یک تجربهٔ مستقیم فرصت‌های متعدد برای کسب نمره، احترام به نظر دانشجو و امتحان تستی قابل‌مدیریت را مثبت دانسته است. حساسیت به استفاده از گوشی نیز گزارش شده است."]
  ];

  const FEEDBACK_BY_PROFESSOR_ID = Object.freeze({
    "109": ["تجربه‌ام از درس دانش خانواده با استاد ربانی خیلی خوب بود."],
    "122": ["از نمره‌دهی رضایت نداشتم و حضور منظم در کلاس لازم بود."],
    "124": ["برای درس انقلاب، تجربه‌ام از نمره‌دهی استاد عزیزخانی خوب بود."],
    "130": ["به نظرم کمی سخت‌گیر هستند.", "تجربه‌ام از این استاد خیلی خوب بود."],
    "131": ["تجربه‌ام از این استاد خیلی خوب بود."],
    "313": ["تجربه‌ام از استاد ترکی خیلی خوب بود."]
  });

  const NOTES = RAW.map(([aliases, direction, confidence, summary]) => ({ aliases, direction, confidence, summary }));
  const directionLabel = { positive:"عمدتاً مثبت", mixed:"ترکیبی", negative:"عمدتاً منفی" };
  const confidenceLabel = { high:"بالاتر", medium:"متوسط", low:"محدود" };

  function normalize(value = "") {
    return String(value).toLowerCase()
      .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[أإآٱ]/g, "ا").replace(/[ۀة]/g, "ه")
      .replace(/[\u064b-\u065f\u0670]/g, "").replace(/[\u200c\u200d]/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);
  }

  function noteFor(name) {
    const normalizedName = normalize(name);
    const exact = NOTES.filter(note => note.aliases.some(alias => normalize(alias) === normalizedName));
    if (exact.length === 1) return exact[0];

    const candidates = NOTES.filter(note => note.aliases.some(alias => {
      const normalizedAlias = normalize(alias);
      const words = normalizedAlias.split(" ").filter(Boolean);
      return words.length >= 2 && normalizedName.includes(normalizedAlias);
    }));
    return candidates.length === 1 ? candidates[0] : null;
  }

  function inject() {
    const drawer = document.querySelector("#drawer");
    const body = document.querySelector("#drawerBody");
    const name = document.querySelector("#dName")?.textContent?.trim();
    if (!drawer || !body || !name || !drawer.classList.contains("open")) return;

    const professorId = drawer.dataset.pid || "";
    const feedback = FEEDBACK_BY_PROFESSOR_ID[professorId] || [];
    const key = `${normalize(name)}:${professorId}`;
    const existing = body.querySelector("[data-community-summary]");
    const note = noteFor(name);
    if (!note && !feedback.length) {
      if (existing) existing.remove();
      return;
    }
    if (existing?.dataset.communityFor === key) return;
    if (existing) existing.remove();

    const summaryHTML = note ? `<h3 class="course-heading">خلاصهٔ تجربه‌های دانشجویی</h3><div class="callout profile-callout"><p>${escapeHTML(note.summary)}</p><div class="badges"><span class="badge">جهت کلی: ${escapeHTML(directionLabel[note.direction] || "—")}</span><span class="badge">پشتوانهٔ کیفی: ${escapeHTML(confidenceLabel[note.confidence] || "—")}</span></div><small>این خلاصه از پیام‌های ارسالی استخراج شده، نقل‌قول مستقیم نیست و روی امتیاز عددی استاد اثر نمی‌گذارد.</small></div>` : "";
    const feedbackHTML = feedback.length ? `<section class="community-section"><div class="community-head"><h3>متن بازخوردهای دانشجوها</h3><span class="community-badge">${feedback.length.toLocaleString("fa-IR")} مورد</span></div><div class="community-list">${feedback.map(text => `<article class="community-card"><div class="community-card-head"><span class="community-badge">مضمون بازخورد</span></div><div class="community-text">${escapeHTML(text)}</div></article>`).join("")}</div><div class="community-note">بازخوردها ناشناس و برای حفظ حریم خصوصی به‌صورت کوتاه و پالایش‌شده بازنویسی شده‌اند؛ نقل‌قول خام نیستند و در محاسبهٔ امتیاز عددی استاد دخالت ندارند.</div></section>` : "";

    const section = document.createElement("section");
    section.dataset.communitySummary = "true";
    section.dataset.communityFor = key;
    section.innerHTML = summaryHTML + feedbackHTML;
    body.append(section);
  }

  const body = document.querySelector("#drawerBody");
  const title = document.querySelector("#dName");
  if (body) new MutationObserver(() => queueMicrotask(inject)).observe(body, { childList:true });
  if (title) new MutationObserver(() => queueMicrotask(inject)).observe(title, { childList:true, subtree:true, characterData:true });
  document.addEventListener("ui:data-ready", inject);
  document.addEventListener("click", event => { if (event.target.closest("[data-open-id]")) setTimeout(inject, 0); });
})();
