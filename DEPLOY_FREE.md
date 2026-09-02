# تشغيل مجاني من الهاتف

## 1) GitHub
- أنشئ مستودعًا جديدًا وارفع محتويات هذا المشروع.
- لا ترفع ملف `.env` أو أي مفاتيح سرية.

## 2) بناء APK
GitHub Actions يحتوي workflow باسم `Build Android APK`.
من GitHub: Actions → Build Android APK → Run workflow.
بعد انتهاء البناء: Artifacts → `tawasol-debug-apk`.

> بناء Debug مجاني عبر GitHub Actions ضمن حدود حسابك. نشر التطبيق على Google Play ليس مجانيًا بالكامل ويتطلب حساب مطوّر ورسوم Google.

## 3) قاعدة البيانات والخدمات
لمنصة إنتاجية، اربط PostgreSQL وRedis وObject Storage وLiveKit وOpenAI ومزوّد دفع فعلي.
`docker-compose.yml` مناسب للتطوير المحلي فقط.

## 4) تشغيل محلي
```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run build
npm run server
```

## 5) Android محلي
```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```
