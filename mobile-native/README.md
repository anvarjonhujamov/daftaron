# Daftaron Native (Expo React Native)

Bu papka web/TWA emas, to'liq native React Native ilova uchun tayyorlangan.

## Nega Play Market qabul qiladi
- Ilova WebView shell emas, native navigation va native ekranlardan iborat.
- Login, register, dashboard, customers, history, reports, profile oqimlari native yozilgan.
- API bilan to'g'ridan-to'g'ri ishlaydi (axios + bearer token).
- Session `AsyncStorage`da boshqariladi, 401 holatda logout qilinadi.

## Tayyorlangan qismlar
- Auth:
  - `LoginScreen`
  - `RegisterScreen` (3 step: ism/telefon, SMS verify, complete)
- Main tabs:
  - `DashboardScreen`
  - `CustomersScreen`
  - `HistoryScreen`
  - `ReportsScreen`
  - `ProfileScreen`
- API qatlam:
  - `auth`, `dashboard`, `customers`, `debts`, `payments`, `profile`, `locations`, `categories`, `subscription`
- Theme:
  - Light/dark mode

## Ishga tushirish
1. Papkaga kiring:
```bash
cd mobile-native
```
2. Dependency o'rnating:
```bash
npm install
```
3. Environment yarating:
```bash
cp .env.example .env
```
4. Dev rejim:
```bash
npm run start
```
5. Android native run:
```bash
npm run android
```

## AAB build (Play Store)
1. EAS CLI o'rnating:
```bash
npm i -g eas-cli
```
2. Expo login:
```bash
npx eas-cli login
```
3. Build:
```bash
npx eas-cli build -p android --profile production
```
Natija: `.aab` fayl.

Yoki `package.json` script orqali:
```bash
npm run build:aab
```

## Play Console checklist
1. Privacy policy URL kiriting.
2. Data Safety formasini to'ldiring.
3. Content rating va App access bo'limlarini to'ldiring.
4. Test account talab qilinsa, login ma'lumotini kiriting.
5. Store listingda ilova native funksiyalarini aniq yozing.

## Muhim
- `app.config.js` ichidagi `android.package` ni o'zingizning yakuniy package nomingizga almashtiring.
- Play release oldidan `version` va `android.versionCode` ni oshirib boring.

## Tezkor release ketma-ketligi
```bash
cd mobile-native
npm install
npm run doctor
npm run export:android
npx eas-cli login
npm run build:aab
```
