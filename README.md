# Plus Tensions CRM

Next.js CRM واحد بيجمع **فواتير العملاء** (جدول `invoices`) و**فواتير الموردين / الضرائب** (جدول `invoice_records`)
في تطبيق واحد بواجهة موحّدة. ده MVP وهيتطوّر.

## اللي اتعمل في النسخة دي

1. **UI جديد بالكامل** — design system موحّد: sidebar + topbar، KPI cards، جداول، badges، شارتات، responsive.
2. **إصلاح الـ auth بالكامل** — كوكي واحدة (`crm_session`) هي مصدر الحقيقة. اتشال نظام الـ localStorage + الـ self-healing بتاع صفحة اللوجين، واتشال الـ logout اللي كان GET ورا `<Link>` (سبب الـ flash). الـ logout بقى `POST` من زرار في الـ sidebar، فمستحيل أي prefetch يشغّله.
3. **دمج الـ Tax CRM** — قسم جديد تحت `/tax` بيقرا من `invoice_records`: dashboard، قايمة فواتير الموردين بفلاتر، صفحة تفاصيل + line items + تعديل يدوي، رفع فاتورة لـ n8n، و Export CSV.

## الصفحات

| Route | الوظيفة |
|---|---|
| `/` | فواتير العملاء: الحالات، Mollie، أزرار التذكير (resend/snooze/paid) |
| `/customers` | فهرس العملاء + فولدرات Drive |
| `/tax` | لوحة محاسبة الموردين (spend / VAT / status) |
| `/tax/invoices` | قايمة فواتير الموردين بفلاتر |
| `/tax/invoices/[id]` | تفاصيل الفاتورة + line items + تعديل الحالة/الملاحظات |
| `/tax/upload` | رفع فاتورة (PDF/صورة) لـ n8n |
| `/api/tax/export` | تحميل CSV لكل سجلات الضرائب |
| `/login`, `/api/logout`, `/api/health` | دخول / خروج / صحة |

## Environment variables

| Variable | Required | الوصف |
|---|---|---|
| `DATABASE_URL` | yes | Postgres بتاع جدول `invoices`. داخل Coolify استخدم الـ internal host وبورت `5432`. |
| `CRM_USERNAME` / `CRM_PASSWORD` | yes | بيانات الدخول. |
| `CRM_AUTH_TOKEN` | yes | السر اللي بيتخزن كقيمة للكوكي (خليه طويل وعشوائي). |
| `CRM_COOKIE_SECURE` | optional | `true` بس لما تكون على HTTPS. |
| `N8N_BASE_URL` + `REMINDER_WEBHOOK_SECRET` | for reminders | الـ n8n webhook بتاع `invoice-reminder-action`. |
| `TAX_DATABASE_URL` | optional | Postgres بتاع `invoice_records` لو في قاعدة مختلفة. لو فاضي بيستخدم `DATABASE_URL`. |
| `TAX_INVOICE_TABLE` | optional | اسم الجدول (default `invoice_records`). |
| `CURRENCY_SYMBOL` | optional | رمز العملة في قسم الضرائب (default €). |
| `N8N_UPLOAD_WEBHOOK_URL` + `N8N_WEBHOOK_TOKEN` | for upload | webhook استقبال الفواتير في n8n. |

> مهم بخصوص الدمج: فواتير العملاء (`invoices`) وفواتير الموردين (`invoice_records`) ممكن يكونوا في قاعدتين مختلفتين.
> لو في نفس القاعدة، `DATABASE_URL` لوحده كفاية. لو في قاعدتين، ظبط `TAX_DATABASE_URL` كمان.

انسخ `.env.example` لـ `.env` واملا القيم.

## Run locally

```bash
npm install
cp .env.example .env   # then edit
npm run dev            # http://localhost:3000
```

## Deploy on Coolify

1. Application -> Source = الـ Git repo.
2. Build Pack = Dockerfile، Port = 3000.
3. ضيف الـ environment variables (الجدول فوق).
4. Deploy، وبعدها افتح `/health` للتأكد.
5. للـ redeploy: `git push` (لو Auto Deploy شغّال) أو زرار Redeploy.

## ملاحظات

- كل صفحات البيانات `force-dynamic` وبتتعامل مع سقوط الـ DB بـ panel خطأ نضيف بدل 500.
- الرفع بيتفوروورد لـ n8n من السيرفر (الـ token مش بيتعرّض للمتصفح).
- اتحقّقنا من النسخة دي بـ `next build` ناجح بالكامل (compile + types + lint + كل الـ routes).
