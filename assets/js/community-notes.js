/* Anonymized qualitative summaries from public student-review threads supplied by the project owner.
   These notes do not affect the numeric professor rating. Raw usernames and verbatim chat text are not published. */
(() => {
  const NOTES = [
    { aliases:["محمد ربانی خوراسگانی"], context:["زیست"], direction:"mixed", confidence:"medium", summary:"بازخوردها دربارهٔ تدریس مبانی میکروبیولوژی، منطق امتحان و اثر تکلیف‌ها بر یادگیری عمدتاً مثبت است. در مقابل، یک تجربهٔ مفصل از درس ایمنی زیستی حجم زیاد و پراکندگی مطالب را نقد کرده است؛ بنابراین تجربهٔ دانشجو ممکن است بین درس‌ها متفاوت باشد." },
    { aliases:["گنجعلی خانی"], context:["زیست"], direction:"positive", confidence:"medium", summary:"در یک بازخورد مفصل، تدریس و سطح امتحان مناسب ارزیابی شده و نمره‌دهی نیز مطلوب توصیف شده است. حساسیت به حضور، تأخیر و استفاده از گوشی از نکات تکرارشده در همان تجربه است." },
    { aliases:["شیرین کشفی"], context:["زیست"], direction:"positive", confidence:"medium", summary:"تدریس آزمایشگاه، دانش علمی، رفتار با دانشجو و دقت در محاسبهٔ نمره مثبت ارزیابی شده است. گزارش‌کارها و یادداشت‌برداری منظم برای نتیجهٔ بهتر مهم توصیف شده‌اند." },
    { aliases:["فرزانه ضوئی"], context:["زیست"], direction:"positive", confidence:"medium", summary:"تدریس منسجم و قابل‌فهم، رفتار محترمانه و تکلیف‌های کمک‌کننده به یادگیری از نقاط مثبت گزارش‌شده‌اند. مطالعهٔ دقیق محتوای ارائه‌شده برای امتحان توصیه شده است." },
    { aliases:["جوادی زرنقی"], context:["زیست","بیوشیمی"], direction:"positive", confidence:"low", summary:"برای بیوشیمی ساختار، کیفیت تدریس مثبت ارزیابی شده است. مطالعه در طول ترم و پاسخ تشریحی کامل، به‌ویژه رسم ساختارها، برای نتیجهٔ بهتر توصیه شده است." },
    { aliases:["جوادی راد"], context:["زیست","ژنتیک"], direction:"positive", confidence:"low", summary:"در یک تجربه از ژنتیک پایه، تدریس خوب و ارفاق در نمره‌دهی گزارش شده است. به‌دلیل سنگینی درس، مطالعهٔ پیوسته در طول ترم توصیه شده است." },
    { aliases:["ابطحی"], context:["ریاضی"], direction:"positive", confidence:"medium", summary:"چند اشارهٔ مستقل ایشان را در میان استادان خوب ریاضی قرار داده‌اند؛ با این حال جزئیات کافی دربارهٔ شیوهٔ تدریس یا ارزیابی در این مجموعه وجود ندارد." },
    { aliases:["علیخانی"], context:["ریاضی"], direction:"positive", confidence:"medium", summary:"در یک بازخورد مفصل، تدریس روان، جزوه‌های کمک‌کننده، درک شرایط دانشجو و امتحان متناسب با تدریس مثبت ارزیابی شده است." },
    { aliases:["یاراحمدی","م یاراحمدی"], context:["ریاضی"], direction:"negative", confidence:"medium", summary:"دو بازخورد مستقل از نمره‌دهی غیرقابل‌پیش‌بینی، تفاوت میان فضای کلاس و ارزیابی پایان‌ترم و تخصیص نامتوازن زمان به مباحث انتقاد کرده‌اند. این جمع‌بندی فقط تجربهٔ گزارش‌دهندگان است." },
    { aliases:["سمانه لطفی"], context:["ریاضی"], direction:"positive", confidence:"medium", summary:"رفتار همراه، توضیح جزئی، تخته‌نویسی منظم و ارتباط خوب با دانشجو مثبت ارزیابی شده است. حضور در کلاس مهم توصیف شده و یک دانشجو تجربهٔ دو ترم موفق را گزارش کرده است." },
    { aliases:["مالک عباسی"], context:["ریاضی"], direction:"positive", confidence:"low", summary:"در یک تجربه، تصحیح با ارفاق و توجه به روش حل حتی در صورت خطای جواب نهایی گزارش شده است." },
    { aliases:["مسعود سبزواری"], context:["ریاضی"], direction:"mixed", confidence:"medium", summary:"دانش علمی، رفتار و کیفیت تدریس بسیار مثبت ارزیابی شده‌اند، اما امتحان‌ها سخت توصیف شده‌اند." },
    { aliases:["ندا اسماعیلی"], context:["ریاضی"], direction:"positive", confidence:"low", summary:"برای معادلات دیفرانسیل یک توصیهٔ مثبت ثبت شده است، اما جزئیات بیشتری در این مجموعه وجود ندارد." },
    { aliases:["خاتمی"], context:["ریاضی"], direction:"positive", confidence:"medium", summary:"در چند پیام مستقل در فهرست استادان خوب ریاضی قرار گرفته و در یک بازخورد بعدی از همه نظر مثبت ارزیابی شده است؛ جزئیات روش ارزیابی محدود است." },
    { aliases:["فاطمه جعفری","جعفری"], context:["مددکاری","اجتماعی"], direction:"positive", confidence:"high", summary:"چند بازخورد مستقل بر آموزش کاربردی و مثال‌محور، مهربانی، دانش علمی، اهمیت‌دادن به یادگیری و نمره‌دهی منصفانه تأکید دارند. تکلیف‌ها نیز کمک‌کننده به نمره و یادگیری توصیف شده‌اند." },
    { aliases:["مهسا جلالی"], context:["ادبیات","فارسی"], direction:"positive", confidence:"medium", summary:"تدریس و نمره‌دهی مثبت ارزیابی شده و حضور و غیاب دارای اثر مستقیم گزارش شده است. یک دانشجو افزایش محسوس نمره نهایی را نیز ذکر کرده است." },
    { aliases:["محمدرضا منصوری"], context:["زبان","انگلیسی"], direction:"positive", confidence:"high", summary:"دو بازخورد مفصل، رفتار خوب، فضای غیرخسته‌کنندهٔ کلاس، امتحان قابل‌پیش‌بینی و ارفاق در نمره را مثبت ارزیابی کرده‌اند. فعالیت‌های داوطلبانه برای نمرهٔ اضافه نیز گزارش شده است." },
    { aliases:["فرشته احمدی"], context:["ادبیات","فارسی"], direction:"positive", confidence:"medium", summary:"کلاس غیرخشک، رفتار مهربان، تدریس خوب و انعطاف در نمره‌دهی از نکات مثبت گزارش‌شده‌اند." },
    { aliases:["فاطمه یثربی"], context:["زبان","انگلیسی"], direction:"positive", confidence:"medium", summary:"در یک تجربه، ارائه و مشارکت فعال در کلاس مسیر مناسبی برای گرفتن نمرهٔ بالا توصیف شده است." },
    { aliases:["محمدرضا رهنما","رهنما"], context:["زبان","انگلیسی"], direction:"positive", confidence:"medium", summary:"سخت‌گیری پایین، امتحان تستی و امکان فعالیت یا ارائهٔ اضافه برای بهبود نمره از نکات مثبت گزارش‌شده‌اند." },
    { aliases:["مریم حمصیان","حمصیان"], context:["زبان","انگلیسی"], direction:"mixed", confidence:"medium", summary:"نمره‌دهی در یک تجربه بد ارزیابی نشده، اما همان دانشجو از خطاهای تلفظی و گرامری انتقاد کرده است. برای درس انقلاب نیز یک تجربهٔ جداگانه ایشان را خوب و امتحان را تشریحی توصیف کرده است." },
    { aliases:["سعید خزایی","خزایی"], context:["زبان","انگلیسی"], direction:"positive", confidence:"low", summary:"یک توصیهٔ مستقیم و مثبت برای درس زبان ثبت شده است، اما جزئیات روش تدریس و ارزیابی محدود است." },
    { aliases:["حشمت الله یاوری","حشمت اله یاوری","حشمت یاوری","یاوری"], context:["فیزیک"], direction:"mixed", confidence:"medium", summary:"بخش عمدهٔ بازخوردها تدریس، رفتار، پاسخ‌گویی و نمره‌دهی را بسیار مثبت توصیف می‌کنند و یک بازخورد ماه‌ها بعد نیز کیفیت تدریس را تأیید کرده است. در عین حال یک توصیهٔ منفی هم وجود دارد و تعداد زیادی از تعریف‌ها در یک بازهٔ زمانی بسیار کوتاه منتشر شده‌اند؛ بنابراین این بخش با احتیاط وزن‌دهی شده است." },
    { aliases:["ابراهیم قنبری","قنبری"], context:["فیزیک"], direction:"positive", confidence:"medium", summary:"در چند توصیه برای فیزیک ۲ از ایشان به‌عنوان گزینهٔ خوب نام برده شده است؛ جزئیات دقیق‌تر دربارهٔ امتحان و نمره‌دهی در این مجموعه محدود است." },
    { aliases:["نوربخش حبیب آبادی","نوربخش"], context:["فیزیک"], direction:"negative", confidence:"low", summary:"یک بازخورد قابل‌استفاده ایشان را سخت‌گیر توصیف کرده است. پیام‌های توهین‌آمیز یا فاقد جزئیات در این جمع‌بندی وارد نشده‌اند." },
    { aliases:["جلالی"], context:["فیزیک"], direction:"negative", confidence:"low", summary:"در یک تجربه، رفتار سخت‌گیرانه و فضای خسته‌کنندهٔ کلاس گزارش شده است. به‌دلیل تک‌منبعی بودن، این جمع‌بندی اطمینان محدودی دارد." },
    { aliases:["سلطانی"], context:["فیزیک"], direction:"positive", confidence:"medium", summary:"نمره‌دهی، اخلاق و سطح امتحان مثبت ارزیابی شده‌اند؛ همان بازخورد کیفیت تدریس را ضعیف‌تر دانسته و تأکید کرده که مطالعهٔ شخصی همچنان لازم است." },
    { aliases:["ایرج آذرفزا"], context:["فلسفه"], direction:"positive", confidence:"low", summary:"در یک بازخورد جمعی از جدیت علمی و اخلاق آکادمیک ایشان به‌صورت بسیار مثبت یاد شده است." },
    { aliases:["رضا کورنگ بهشتی"], context:["فلسفه"], direction:"positive", confidence:"low", summary:"در یک بازخورد جمعی از جدیت علمی و اخلاق آکادمیک ایشان به‌صورت بسیار مثبت یاد شده است." },
    { aliases:["هومن محمد قربانیان"], context:["فلسفه"], direction:"positive", confidence:"low", summary:"در یک بازخورد جمعی از جدیت علمی و اخلاق آکادمیک ایشان به‌صورت بسیار مثبت یاد شده است." },
    { aliases:["امیراحسان کرباسی زاده","امیراحسان کرباسی‌زاده"], context:["فلسفه"], direction:"positive", confidence:"low", summary:"در یک بازخورد جمعی از جدیت علمی و اخلاق آکادمیک ایشان به‌صورت بسیار مثبت یاد شده است." },
    { aliases:["علی کلانتری"], context:["فلسفه"], direction:"positive", confidence:"low", summary:"در یک بازخورد جمعی از جدیت علمی و اخلاق آکادمیک ایشان به‌صورت بسیار مثبت یاد شده است." },
    { aliases:["سبزیان"], context:["شیمی"], direction:"negative", confidence:"high", summary:"چند بازخورد مستقل دربارهٔ سخت‌گیری بالا، امتحان تستی با نمرهٔ منفی و انعطاف کم در مرز قبولی هشدار داده‌اند. در یکی از همین تجربه‌ها، کیفیت تدریس قابل‌قبول توصیف شده و امکان پرسیدن سؤال در کلاس نکتهٔ مثبت دانسته شده است." },
    { aliases:["هادی امیری رودباری","امیری رودباری"], context:["شیمی"], direction:"mixed", confidence:"medium", summary:"بازخوردهای زیادی بر احترام به دانشجو، پاسخ‌گویی، توضیح درس و نمره‌دهی مناسب تأکید دارند. در مقابل، یک تجربه از تأخیر در اعلام نمره و یک مخالفت مستقیم با توصیه‌های مثبت وجود دارد. بخش بزرگی از پیام‌های مثبت در بازهٔ زمانی کوتاهی منتشر شده‌اند، بنابراین با احتیاط تفسیر شده‌اند." },
    { aliases:["محسن مصلحی","مصلحی"], context:["شیمی"], direction:"positive", confidence:"medium", summary:"دو اشارهٔ مستقل ایشان را در میان استادان بسیار خوب قرار داده‌اند، اما جزئیات روش تدریس و ارزیابی محدود است." },
    { aliases:["یداللهی"], context:["شیمی"], direction:"positive", confidence:"low", summary:"در یک توصیهٔ مستقیم در میان بهترین استادان شیمی نام برده شده است؛ جزئیات بیشتری در این مجموعه وجود ندارد." },
    { aliases:["صفایی"], context:["شیمی"], direction:"positive", confidence:"low", summary:"در یک توصیهٔ مستقیم در میان بهترین استادان شیمی نام برده شده است؛ جزئیات بیشتری در این مجموعه وجود ندارد." },
    { aliases:["ملک پور","ملک‌پور"], context:["شیمی"], direction:"positive", confidence:"low", summary:"یک توصیهٔ مثبت و مستقیم ثبت شده است؛ جزئیات بیشتری دربارهٔ کلاس یا ارزیابی در این مجموعه وجود ندارد." },
    { aliases:["نشاط دوست","نشاط‌دوست"], context:["روانشناسی"], direction:"positive", confidence:"low", summary:"در یک بازخورد، خوش‌اخلاقی و همراهی با دانشجو به‌عنوان نقطهٔ قوت مطرح شده است." },
    { aliases:["مریم اسماعیلی"], context:["روانشناسی"], direction:"positive", confidence:"low", summary:"در یک بازخورد، تدریس و رفتار در کلاس بسیار مثبت ارزیابی شده است." },
    { aliases:["شیخی سینی"], context:["تربیت بدنی","ورزش"], direction:"positive", confidence:"medium", summary:"در چند بازهٔ زمانی جداگانه به‌عنوان گزینهٔ بسیار خوب برای تربیت بدنی توصیه شده است؛ جزئیات روش ارزیابی محدود است." },
    { aliases:["عسگرانی"], context:["تربیت بدنی","ورزش"], direction:"positive", confidence:"medium", summary:"چند توصیهٔ مثبت ثبت شده و یک تجربهٔ مفصل از نمره‌های بالا، امتحان کتبی آسان و ارزیابی عملی قابل‌مدیریت گزارش می‌کند." },
    { aliases:["نسرین محمد صالحی","محمدصالحی"], context:["تربیت بدنی","ورزش"], direction:"positive", confidence:"medium", summary:"در یک تجربه، صمیمیت و فاصلهٔ کم با دانشجو و سخت‌گیری پایین مثبت ارزیابی شده است." },
    { aliases:["رضوان عظیمی"], context:["تربیت بدنی","ورزش"], direction:"negative", confidence:"low", summary:"یک توصیهٔ منفی صریح برای درس ورزش ثبت شده است، اما توضیح جزئی دربارهٔ علت نارضایتی ارائه نشده است." },
    { aliases:["علی قنبری"], context:["تربیت بدنی","ورزش"], direction:"positive", confidence:"low", summary:"یک توصیهٔ مستقیم و مثبت ثبت شده است؛ جزئیات بیشتر محدود است." },
    { aliases:["فرحناز شمس"], context:["تربیت بدنی","ورزش"], direction:"positive", confidence:"low", summary:"یک توصیهٔ مستقیم و مثبت ثبت شده است؛ جزئیات بیشتر محدود است." },
    { aliases:["شیوا هدایتی"], context:["تربیت بدنی","ورزش"], direction:"positive", confidence:"low", summary:"یک توصیهٔ مستقیم و مثبت ثبت شده است؛ جزئیات بیشتر محدود است." },
    { aliases:["هاجر الله وردی","هاجر الله‌وردی"], context:["تربیت بدنی","ورزش"], direction:"positive", confidence:"low", summary:"یک توصیهٔ مستقیم و مثبت ثبت شده است؛ جزئیات بیشتر محدود است." },
    { aliases:["مرضیه رجالی"], context:["حسابداری"], direction:"mixed", confidence:"medium", summary:"تدریس مثبت ارزیابی شده و گفته شده با مطالعهٔ جزوه می‌توان نمرهٔ کامل گرفت. در عین حال نمره‌دهی بسیار دقیق و بدون گرد کردن حتی برای اعشار کوچک گزارش شده است." },
    { aliases:["هاشم زاده","هاشم‌زاده"], context:["معارف"], direction:"positive", confidence:"high", summary:"در چند دورهٔ زمانی و چند پیام مستقل به‌عنوان یکی از گزینه‌های بسیار خوب معارف توصیه شده است. فضای کلاس کم‌تنش و تجربهٔ کلی مثبت گزارش شده، هرچند جزئیات امتحان در همهٔ پیام‌ها یکسان نیست." },
    { aliases:["محسن شیراوند","شیراوند"], context:["معارف"], direction:"positive", confidence:"high", summary:"چند بازخورد در سال‌های مختلف ایشان را گزینهٔ خوب معارف دانسته‌اند. در یک تجربهٔ دو درس، هر دو نمرهٔ ۲۰ گزارش شده و فعالیت‌های اختیاری برای نمرهٔ اضافه نیز ذکر شده است." },
    { aliases:["اشرفی"], context:["آمار","ریاضی"], direction:"positive", confidence:"high", summary:"چند توصیهٔ مستقل مثبت وجود دارد. یک بازخورد مفصل بر مثال‌های فراوان، سؤال‌های محدود و نزدیک به نمونه‌های کلاس و یادگیری بهتر تأکید کرده است." },
    { aliases:["قاسمیان"], context:["آمار","ریاضی"], direction:"mixed", confidence:"high", summary:"بازخوردها دوگانه‌اند: چند دانشجو تجربهٔ بسیار خوب و حتی نمرهٔ ۲۰ داشته‌اند، در حالی که یک تجربهٔ مفصل از امتحان طولانی، زمان کم و تدریس ضعیف انتقاد کرده است. تفاوت تجربه‌ها بین کلاس‌ها یا ترم‌ها محتمل است." },
    { aliases:["بهاره اختری","اختری"], context:["ریاضی","محاسبات"], direction:"mixed", confidence:"medium", summary:"کیفیت تدریس مثبت گزارش شده، اما رفتار نوسانی و نمره‌دهی متوسط توصیف شده است. در آن تجربه، اگر هدف صرفاً نمره باشد استاد دیگری ترجیح داده شده است." },
    { aliases:["عابدینی"], context:["معارف","دانش خانواده"], direction:"positive", confidence:"medium", summary:"در چند توصیهٔ مستقل برای درس دانش خانواده از ایشان به‌عنوان گزینهٔ خوب نام برده شده است؛ جزئیات روش ارزیابی محدود است." },
    { aliases:["غفارزاده"], context:["معارف","دانش خانواده"], direction:"positive", confidence:"medium", summary:"در چند پیام مستقل برای دانش خانواده توصیه شده است؛ جزئیات روش تدریس و امتحان محدود است." },
    { aliases:["پروین نبیان","نبیان"], context:["معارف"], direction:"negative", confidence:"medium", summary:"دو تجربهٔ منفی یا کم‌رضایت ثبت شده‌اند. کلاس خسته‌کننده و وابستگی امتحان به مطالب گفته‌شده در کلاس از نکات مطرح‌شده است؛ در عین حال سخت‌گیری روی استفاده از گوشی پایین گزارش شده است." },
    { aliases:["نصر اصفهانی"], context:["معارف"], direction:"mixed", confidence:"medium", summary:"اخلاق و فضای نسبتاً آزاد کلاس مثبت ارزیابی شده، اما همان تجربه کیفیت امتحان را چندان مطلوب ندانسته است." },
    { aliases:["حمزه علی بهرامی"], context:["معارف"], direction:"positive", confidence:"low", summary:"یک توصیهٔ مستقیم و مثبت برای اندیشه اسلامی ثبت شده است؛ جزئیات بیشتری در این مجموعه وجود ندارد." },
    { aliases:["فاطمه رحمانی"], context:["زبان","انگلیسی"], direction:"positive", confidence:"low", summary:"اخلاق، ارفاق و نمره‌دهی مثبت ارزیابی شده‌اند؛ جزئیات بیشتری در این مجموعه وجود ندارد." },
    { aliases:["فاطمه امینی"], context:["زبان","انگلیسی"], direction:"positive", confidence:"low", summary:"مطالعهٔ فایل‌های معرفی‌شده برای گرفتن نمرهٔ بالا کافی توصیف شده و نمره‌دهی منصفانه همراه با ارفاق گزارش شده است." },
    { aliases:["فهیمه سیفی"], context:["زبان","انگلیسی"], direction:"positive", confidence:"low", summary:"یک توصیهٔ مستقیم و مثبت ثبت شده است؛ جزئیات بیشتر محدود است." },
    { aliases:["جان نثاری","جانثاری","جان‌نثاری"], context:["معارف","تفسیر"], direction:"positive", confidence:"high", summary:"یک بازخورد مفصل و یک توصیهٔ جداگانه، رفتار بسیار همراه، امکان کسب نمرهٔ بالا و ساختار روشن نمره از تکلیف، حضور و امتحان را مثبت ارزیابی کرده‌اند." },
    { aliases:["مشکات"], context:["معارف"], direction:"mixed", confidence:"medium", summary:"رفتار آرام و محترمانه و فضای کم‌تنش کلاس مثبت ارزیابی شده است. در مقابل، برای گرفتن نمرهٔ کامل حضور مستمر، مشارکت و توجه به جزئیات مطرح‌شده در کلاس مهم گزارش شده‌اند." },
    { aliases:["احمدنژاد"], context:["معارف","تفسیر"], direction:"positive", confidence:"medium", summary:"یک توصیهٔ مثبت ثبت شده و امتحان کتاب‌باز توصیف شده است. حضور و غیاب بخش مهمی از نمره گزارش شده است." },
    { aliases:["زمانی خارایی","زمانی"], context:["معارف"], direction:"positive", confidence:"medium", summary:"در بیش از یک پیام مستقل به‌عنوان گزینهٔ خوب معارف معرفی شده است؛ جزئیات روش تدریس و ارزیابی محدود است." },
    { aliases:["الهام آقادوستی","آقادوستی","اقادوستی"], context:["معارف"], direction:"mixed", confidence:"medium", summary:"تدریس نسبتاً خوب، امکان نمرهٔ اضافه از جزوه و تحقیق، میان‌ترم و امتحان با سطح متوسط گزارش شده است. مشارکت در کلاس برای نمرهٔ بهتر مؤثر توصیف شده است." },
    { aliases:["حقیقی"], context:["معارف","دانش خانواده"], direction:"negative", confidence:"medium", summary:"یک تجربهٔ مستقیم از نمره‌دهی غیرقابل‌پیش‌بینی در دانش خانواده انتقاد کرده است. پیام‌های بعدی که صرفاً همان نظر را بازگو کرده‌اند به‌عنوان شاهد مستقل حساب نشده‌اند." },
    { aliases:["بکتاشیان"], context:["معارف","انقلاب"], direction:"positive", confidence:"medium", summary:"رفتار خوش، سخت‌گیری پایین روی مسائل جانبی و امتحان نسبتاً آسان از بخش‌های مشخص‌شدهٔ کتاب گزارش شده است. حضور منظم برای نمرهٔ بهتر مهم دانسته شده است." },
    { aliases:["نظر پور","نظرپور"], context:["معارف","اندیشه"], direction:"positive", confidence:"high", summary:"چند بازخورد مستقل، اخلاق، فضای کلاس و نمره‌دهی را مثبت ارزیابی کرده‌اند. حضور کامل و امتیازهای مازاد بر ۲۰ گزارش شده و یک دانشجو با وجود سخت‌تر شدن امتحان، نمرهٔ نهایی را خوب دانسته است." },
    { aliases:["شاهسنایی","شاه سنایی"], context:["معارف","حقوق"], direction:"positive", confidence:"medium", summary:"در چند توصیهٔ جداگانه به‌عنوان گزینهٔ خوب معرفی شده است؛ جزئیات ارزیابی محدود است." },
    { aliases:["مرتضوی بک"], context:["معارف","تاریخ"], direction:"positive", confidence:"low", summary:"یک توصیهٔ مستقیم برای درس تاریخ ثبت شده است؛ جزئیات بیشتر محدود است." },
    { aliases:["داریوش محمدی"], context:["عربی"], direction:"positive", confidence:"high", summary:"یک دانشجو بر پایهٔ ۱۰ واحد در دو ترم، اخلاق، همراهی با دانشجو، سخت‌گیری پایین و نمره‌دهی را بسیار مثبت ارزیابی کرده است." },
    { aliases:["مرضیه شماعی","شماعی"], context:["معارف","دانش خانواده"], direction:"mixed", confidence:"medium", summary:"با وجود شنیده‌های منفی اولیه، یک تجربهٔ مستقیم فرصت‌های متعدد برای کسب نمره، احترام به نظر دانشجو و امتحان تستی قابل‌مدیریت را مثبت دانسته است. حساسیت به استفاده از گوشی نیز گزارش شده است." }
  ];

  const directionLabel = { positive:"عمدتاً مثبت", mixed:"ترکیبی", negative:"عمدتاً منفی" };
  const confidenceLabel = { high:"بالاتر", medium:"متوسط", low:"محدود" };

  function normalize(value = "") {
    return String(value).toLowerCase()
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/[ۀة]/g, "ه")
      .replace(/[\u064b-\u065f\u0670]/g, "")
      .replace(/[\u200c\u200d]/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[character]);
  }

  function noteFor(name, meta) {
    const normalizedName = normalize(name);
    const normalizedMeta = normalize(meta);
    const exact = NOTES.filter(note => note.aliases.some(alias => normalize(alias) === normalizedName));
    if (exact.length === 1) return exact[0];

    const candidates = NOTES.filter(note => note.aliases.some(alias => {
      const normalizedAlias = normalize(alias);
      const aliasWords = normalizedAlias.split(" ").filter(Boolean);
      if (aliasWords.length >= 2 && normalizedName.includes(normalizedAlias)) return true;
      if (aliasWords.length === 1 && normalizedName.split(" ").includes(normalizedAlias)) {
        return !note.context?.length || note.context.some(term => normalizedMeta.includes(normalize(term)));
      }
      return false;
    }));
    return candidates.length === 1 ? candidates[0] : null;
  }

  function inject() {
    const drawer = document.querySelector("#drawer");
    const body = document.querySelector("#drawerBody");
    const name = document.querySelector("#dName")?.textContent?.trim();
    const meta = document.querySelector("#dMeta")?.textContent?.trim() || "";
    if (!drawer || !body || !name || !drawer.classList.contains("open")) return;
    body.querySelectorAll("[data-community-summary]").forEach(node => node.remove());
    const note = noteFor(name, meta);
    if (!note) return;

    const section = document.createElement("section");
    section.dataset.communitySummary = "true";
    section.innerHTML = `<h3 class="course-heading">خلاصهٔ تجربه‌های دانشجویی</h3><div class="callout profile-callout"><p>${escapeHTML(note.summary)}</p><div class="badges"><span class="badge">جهت کلی: ${escapeHTML(directionLabel[note.direction] || "—")}</span><span class="badge">پشتوانهٔ کیفی: ${escapeHTML(confidenceLabel[note.confidence] || "—")}</span></div><small>این خلاصه از پیام‌های عمومیِ ارسالی استخراج شده، نقل‌قول مستقیم نیست و روی امتیاز عددی استاد اثر نمی‌گذارد.</small></div>`;
    body.append(section);
  }

  const body = document.querySelector("#drawerBody");
  const title = document.querySelector("#dName");
  if (body) new MutationObserver(() => queueMicrotask(inject)).observe(body, { childList:true });
  if (title) new MutationObserver(() => queueMicrotask(inject)).observe(title, { childList:true, subtree:true, characterData:true });
  document.addEventListener("ui:data-ready", inject);
  document.addEventListener("click", event => {
    if (event.target.closest("[data-open-id]")) setTimeout(inject, 0);
  });
})();
