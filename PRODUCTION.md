# تواصل — تشغيل الإنتاج

هذه النسخة تحتوي Backend حقيقي قابل للتشغيل مع PostgreSQL وRedis وObject Storage وWebSocket و2FA وLiveKit/OpenAI/Queues.

## تشغيل محلي
1. انسخ `.env.example` إلى `.env` وعدّل `JWT_SECRET`.
2. `docker compose up -d`
3. `npm install`
4. `npx prisma generate`
5. `npx prisma db push`
6. `npm run server`
7. شغّل الواجهة بـ `npm run dev`.

## الخدمات الخارجية
- OpenAI: ضع المفتاح في `OPENAI_API_KEY`.
- LiveKit: ضع URL والمفتاح والسر في متغيرات البيئة.
- Object Storage: استخدم S3/MinIO، ولا تجعل الملفات العامة قابلة للكتابة.
- الدفع والسحب: يجب تفعيل مزود دفع/تحويل معتمد قانونيًا في البلد المستهدف؛ الكود يرفض التشغيل إذا لم يُضبط مزود حقيقي بدل ادعاء نجاح الدفع.
- Cloudflare/WAF وDNS وTLS وSecrets Manager وMonitoring وBackups تُضبط في بيئة الاستضافة.

## الأمان
JWT قصير العمر، كلمات مرور bcrypt، 2FA TOTP، Helmet، rate limiting، audit logs، moderation queue، وفصل الأسرار عن Frontend. أضف refresh-token rotation وCSRF/cookie strategy عند اعتماد جلسات الويب النهائية.

## التوسع
Redis/BullMQ للمهام، Socket.IO للـRealtime، LiveKit للـWebRTC، Object Storage للوسائط. هدف 100K هو قدرة توسع عبر autoscaling، وليس 100 ألف Worker دائم.
