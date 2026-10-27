---
name: deploy-web
description: web.daftaron.uz (React SPA/PWA) ni production'ga chiqarish — build, serverda backup, dist/ ni rsync, document_errors/404.html ni yangilash va jonli bundle'ni tekshirish. Foydalanuvchi "deploy qil", "prod'ga chiqar", "serverga yukla" desa yoki o'zgarish prod'da ko'rinmayotganini tekshirish kerak bo'lganda ishlating.
---

# web.daftaron.uz deploy

Server: HestiaCP `ruslan.firstcoders.uz`, user `xurshidbek1`, docroot `~/web/web.daftaron.uz/public_html` (oddiy statik nusxa). SSH parol bilan ishlaydi; parol macOS Keychain'da (`-s hestia -a xurshidbek1`) — backend'dagi `prod-db` skill bilan bir xil yozuv.

```bash
S=.claude/skills/deploy-web/scripts/deploy.sh
$S --dry-run      # build + qaysi fayllar yuklanishini ko'rsatadi, serverga yozmaydi
$S                # to'liq deploy
$S --skip-build   # mavjud dist/ ni yuklash
```

Skript tartibi: `npm run build` → `private/public_html-backup-YYYYMMDD-HHMM.tar.gz` → `rsync -rlz dist/ public_html/` (`--delete`siz) → `cp public_html/index.html document_errors/404.html` → `/` va `/debts` dagi `assets/index-*.js` `dist/index.html` bilan solishtiriladi.

## Qoidalar

1. **Deploy'dan oldin foydalanuvchidan aniq tasdiq oling** — bu barcha foydalanuvchilarga darhol chiqadi. Avval `--dry-run`.
2. `npm run build` xatosiz o'tishi shart. Commit qilinmagan o'zgarishlar bo'lsa, ular ham chiqishini foydalanuvchiga ayting.
3. `--delete` qo'shmang: ochiq turgan eski sahifalar eski chunk'larni so'raydi.
4. `404.html` qadamini tashlab ketmang: nginx'da `try_files` yo'q, deep link'lar (`/login`, `/debts/123`) shu fayl orqali ochiladi. Eski 404.html eski bundle'ni yuklaydi.
5. Backend (API) deploy'i bu skill'da emas: u backend repoda `main`ga push orqali GitHub Actions bilan chiqadi.

## Orqaga qaytarish

```bash
ssh xurshidbek1@ruslan.firstcoders.uz 'cd ~/web/web.daftaron.uz && ls private/ | grep backup'
ssh xurshidbek1@ruslan.firstcoders.uz 'cd ~/web/web.daftaron.uz && tar xzf private/public_html-backup-<STAMP>.tar.gz -C public_html && cp public_html/index.html document_errors/404.html'
```
(skriptdagi kabi `SSH_ASKPASS` bilan yoki foydalanuvchi o'zi terminalda ishga tushiradi). Eski backup'lar `private/`da yig'iladi — vaqti-vaqti bilan tozalashni taklif qiling.

## Muammolar

- `Permission denied` — Keychain'dagi parol eskirgan: `security add-generic-password -U -a xurshidbek1 -s hestia -w`. Parolni chatga yozdirmang.
- SSH umuman ulanmasa (backend TZ.md 26-bo'limda "SSH yo'q" deyilgan): Hestia File Manager orqali yuklash yoki backend'dagi `prod-db` skill (`prod.sh sh "..."`) bilan serverdagi buyruqlarni bajarish mumkin, lekin u fayl yuklay olmaydi.
- Deploy'dan keyin eski versiya ko'rinsa: `sw.js` nginx'da uzoq keshlanadi; `main.jsx` soatda bir va ilova qayta ochilganda yangilanishni tekshiradi. Foydalanuvchi ilovani yopib-ochishi kifoya. To'g'ri yechim (`sw.js`, `index.html` uchun `no-cache`, `try_files`) — server admini (root) ishi.
