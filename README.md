# تواصل — GitHub / Android Production Foundation

منصة **تواصل** العربية RTL: React + PWA + Node/Express + PostgreSQL/Prisma + Redis/BullMQ + Socket.IO + S3/MinIO + LiveKit + OpenAI + Capacitor.

## قبل الرفع إلى GitHub

هذا المستودع **لا يحتوي أسرارًا ولا node_modules ولا مجلد Android مولّدًا**. هذه أمور مقصودة.

1. ارفع محتويات هذا المجلد إلى مستودع GitHub جديد.
2. تأكد أن `package.json` موجود في جذر المستودع، وليس داخل مجلد فرعي.
3. في GitHub افتح **Actions** ثم شغّل **Build Android APK**.
4. بعد نجاح الـworkflow ستجد `tawasol-debug-apk` في Artifacts.

## تشغيل محلي

```bash
cp .env.example .env
npm install
npm run db:generate
docker compose up -d
npm run db:push
npm run dev
```

لتشغيل الـAPI:

```bash
npm run server
```

ولتفعيل عامل المراجعة:

```bash
npm run worker:moderation
```

## خدمات الإنتاج المطلوبة

قبل اعتبار المنصة Production كاملة، يجب إنشاء وإعداد PostgreSQL وRedis والتخزين S3 وLiveKit وOpenAI ومزود الدفع والبريد/SMS والاستضافة/Cloudflare، ثم وضع أسرارها في Secrets/Environment Variables على بيئة الخادم.

**الدفع والسحب غير مفعّلين افتراضيًا** لأن اختيار المزود يعتمد على البلد والمتطلبات القانونية. لا ينبغي اختراع تكامل دفع أو وضع مفاتيح حقيقية في التطبيق.

## أمان مهم

- لا ترفع `.env` أو مفاتيح API إلى GitHub.
- غيّر `JWT_SECRET` في الإنتاج إلى قيمة عشوائية قوية.
- استخدم HTTPS وCORS مقيدًا على نطاقاتك الحقيقية.
- لا تستخدم بيانات Docker الافتراضية في الإنتاج.
- راجع صلاحيات ADMIN وعمليات السحب والدفع قبل الإطلاق.

راجع `docs/PRODUCTION_CHECKLIST.md` و`docs/PRODUCTION.md`.
