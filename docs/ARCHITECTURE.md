# معماری کم‌هزینه و قابل مهاجرت

## تصمیم اصلی

برای شروع، معماری **Vanilla Frontend + PHP/PDO + MySQL/MariaDB** انتخاب شده است. دلیل آن اجرای مستقیم روی هاست اشتراکی ارزان، مصرف RAM نزدیک به صفر بین درخواست‌ها، نبود process دائمی و حذف هزینهٔ Node/container است.

| بخش | انتخاب | دلیل |
| --- | --- | --- |
| UI | HTML/CSS/JS بدون Framework | Bundle کوچک و Cache ساده |
| API | PHP 8.1+ | موجود روی هاست اشتراکی و مقیاس‌پذیری افقی ساده |
| Data access | PDO + Prepared Statements | جداسازی Driver و جلوگیری از SQL Injection |
| Production DB | MySQL/MariaDB | سازگاری گسترده با پنل‌های هاست |
| Test DB | SQLite | آزمون سریع Schema بدون سرویس خارجی |
| Session | Cookie امن PHP | فقط برای CSRF، مدیر و حساب اختیاری |
| Cache | `professor_stats` + HTTP cache | حذف Aggregateهای سنگین از هر Page View |

## جریان ثبت نظر

1. کلاینت CSRF کوتاه‌عمر همان Session را می‌گیرد.
2. Honeypot، طول Payload و Rate Limit بررسی می‌شوند.
3. استاد، حالت نمایش، متن، امتیازها و پیشنهاد Validate می‌شوند.
4. شناسهٔ فنی از IP و User-Agent با HMAC ساخته می‌شود؛ IP خام ذخیره نمی‌شود.
5. Hash متن نرمال‌شده و استاد، ارسال تکراری را تشخیص می‌دهد.
6. محتوای عادی مستقیماً منتشر می‌شود؛ نشانهٔ اطلاعات خصوصی، تهدید یا اسپم به `pending` می‌رود.
7. امتیاز Cache‌شدهٔ استاد فقط پس از تغییر نظر منتشرشده بازسازی می‌شود.

## هزینهٔ Query

- فهرست اولیهٔ ۷۴۳ استاد از فایل فشردهٔ Cacheپذیر خوانده می‌شود و Query دیتابیس ندارد.
- آمار جدید همهٔ استادان در یک Endpoint Cacheشده دریافت می‌شود.
- صفحهٔ نظرها Query صفحه‌بندی‌شده دارد؛ امتیازهای همان ۱۰ نظر در Query گروهی جدا می‌آیند.
- Aggregateهای استاد در `professor_stats` نگهداری می‌شوند و در Page View محاسبه نمی‌شوند.

## مدل داده و Indexها

موجودیت‌ها: `faculties`، `departments`، `professors`، `courses`، `professor_courses`، `users`، `reviews`، `review_ratings`، `votes`، `reports`، `moderation_actions`، `rate_limits`، `professor_stats` و `professor_change_requests`.

- `reviews(professor_id,status,created_at)` برای صفحهٔ استاد.
- `reviews(professor_id,course_name,status)` برای فیلتر درس.
- `reviews(professor_id,duplicate_hash)` و `reviews(technical_hash,created_at)` برای سوءاستفاده.
- `review_ratings(criterion,score)` برای فیلتر امتیاز.
- `reports(status,created_at)` برای صف مدیریت.
- کلید یکتای `(review_id,voter_hash)` برای جلوگیری از رأی تکراری.

## مهاجرت آینده

API JSON مرز مهاجرت است. در بار بالاتر می‌توان بدون تغییر UI، MySQL را به سرویس مدیریت‌شده منتقل کرد، PHP را روی VPS یا چند Replica گذاشت، Cache را به Redis/CDN برد یا ReviewService را با سرویس دیگری و همان Contract جایگزین کرد.

آپلود تصویر عمداً در نسخهٔ شروع وجود ندارد تا هزینه، ریسک حریم خصوصی و نیاز به Object Storage ایجاد نشود.

