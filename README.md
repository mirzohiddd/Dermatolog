# Kaloriya kalkulyatori — Komoliddin Kozimxonovich

Kaloriya kalkulyatori sayti, Telegram bot va admin panel.

- **Sayt:** kalkulyator va shifokor rasmi (Vue 3 + Vite + Tailwind CSS)
- **Telegram bot:** `/start`, Instagram havolasi, ikki adminga bildirishnoma
- **Admin panel:** mijozlar, qidiruv, hisoblashlar tarixi
- **Baza:** JSON fayllar (`backend/data/`)

---

## 1. Loyiha qanday ishlaydi

```
Instagram ─► https://t.me/BOTINGIZ?start=instagram
                    │
                    ▼
            Telegram bot (/start)
            ├─ mijozni users.json ga yozadi (source: instagram)
            ├─ 2 ta adminga "🆕 YANGI MIJOZ" xabari
            └─ "🧮 KALKULYATORNI OCHISH" tugmasi
                    │
                    ▼
            Sayt (Telegram ichida ochiladi)
            └─ HISOBLASH ─► backend
                            ├─ natijani qayta hisoblaydi
                            ├─ calculations.json ga yozadi
                            └─ 2 ta adminga "🧮 YANGI HISOBLASH" xabari
                    │
                    ▼
            Admin panel (/admin) — hamma narsani ko‘rasiz
```

Muhim tafsilotlar:

- **Mijozni aniqlash.** Sayt Telegram ichida ochilganda mijoz avtomatik aniqlanadi. Telegram imzosi (HMAC) serverda tekshiriladi, shuning uchun birov soxta Telegram ID yubora olmaydi.
- **Oddiy brauzerda ham ishlaydi.** Sayt oddiy brauzerda ochilsa ham kalkulyator ishlaydi. Bunday hisoblash "Sayt mehmoni" sifatida saqlanadi.
- **Server ishlamasa.** Natija telefonning o‘zida hisoblanadi — formula bir xil.
- **Formula eski loyihadan ko‘chirilgan.** Mifflin–St Jeor formulasi, faollik koeffitsientlari, 7 ta maqsad, oqsil (1.8 g/kg), yog‘ (0.8 g/kg), uglevod va past BMI ogohlantirishi o‘zgarmagan. Test eski formula bilan 5000 ta holatda bir xil natija berishini tekshiradi.

## 2. Papkalar

```
project/
├── frontend/                  SAYT (Vercel'ga joylanadi)
│   ├── public/                ikonkalar, manifest, service worker (oflayn rejim)
│   ├── src/
│   │   ├── assets/            logo.png va doctor.png  ← rasmlarni shu yerda almashtiring
│   │   ├── components/        kalkulyator, natija, shifokor kartasi, admin bo‘laklari
│   │   ├── views/             sahifalar: bosh sahifa, admin login, dashboard, mijoz
│   │   ├── router/            sahifa manzillari (/, /admin, /admin/login ...)
│   │   ├── services/          API (axios), admin sessiya, Telegram Web App
│   │   ├── utils/calculator.js  KALKULYATOR FORMULASI
│   │   ├── config/brand.js    ism va lavozim matni
│   │   ├── App.vue, main.js, style.css (ranglar va animatsiyalar)
│   ├── vercel.json            Vercel sozlamasi
│   └── .env.example
│
├── backend/                   SERVER + BOT (Render'ga joylanadi)
│   ├── data/                  JSON baza: users.json, calculations.json, admins.json
│   ├── src/
│   │   ├── bot/               Telegram bot (Telegraf)
│   │   ├── routes/            API manzillari
│   │   ├── controllers/       so‘rovlarni qayta ishlash
│   │   ├── services/          jsonDatabase.js (xavfsiz baza), calculator.js,
│   │   │                      bildirishnomalar, Telegram imzosini tekshirish
│   │   ├── middleware/        JWT himoya, xatolar, so‘rovlar cheklovi
│   │   ├── config/env.js      .env ni o‘qish va tekshirish
│   │   └── server.js          kirish nuqtasi
│   ├── tests/                 avtomatik testlar (31 ta)
│   └── .env.example
└── README.md
```

> **Ikkita `calculator.js` bor.** Ular bir xil: `frontend/src/utils/calculator.js` va `backend/src/services/calculator.js`. Formulani o‘zgartirsangiz, ikkalasini ham o‘zgartiring. Keyin `cd backend && npm test` ishga tushiring — test ular bir xil ekanini tekshiradi.

## 3. Kerakli dasturlar

- **Node.js 22** (LTS): https://nodejs.org → "LTS" tugmasi

Tekshirish:

```bash
node -v
npm -v
```

## 4. Telegram bot yaratish (bir marta)

1. Telegramda **@BotFather** ni oching va `/newbot` yozing.
2. Botga nom va username bering (username `_bot` bilan tugashi shart).
3. BotFather sizga token beradi, masalan `7123456789:AAH...`. Bu **BOT_TOKEN**. Uni hech kimga bermang.

**Admin ID larni bilish:**

1. Ikkala admin ham Telegramda **@userinfobot** ga `/start` yozadi.
2. U qaytargan `Id: 123456789` raqami — **ADMIN_ID_1** va **ADMIN_ID_2**.
3. Ikkala admin **o‘z botingizga ham `/start` bosishi SHART**. Aks holda Telegram bot ularga xabar yuborishga ruxsat bermaydi.

## 5. `.env` faylini to‘ldirish

**Mac / Linux:**

```bash
cd backend
cp .env.example .env
```

**Windows (PowerShell):**

```powershell
cd backend
Copy-Item .env.example .env
```

JWT_SECRET uchun tasodifiy kalit yarating va chiqqan uzun satrni nusxalang:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`backend/.env` ni oching va to‘ldiring:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173

BOT_TOKEN=7123456789:AAH...sizning_tokeningiz

ADMIN_ID_1=123456789
ADMIN_ID_2=987654321

ADMIN_USERNAME=komoliddin
ADMIN_PASSWORD=KamidaSakkizBelgi2026
JWT_SECRET=yuqoridagi_buyruq_chiqargan_uzun_satr
```

Qoidalar:

- `ADMIN_PASSWORD` kamida 8 ta belgi bo‘lishi kerak.
- `JWT_SECRET` kamida 32 ta belgi bo‘lishi kerak.
- Nimadir xato bo‘lsa, server ishga tushmaydi va nima xatoligini o‘zbekcha aytadi.
- `.env` fayl `.gitignore` da. U GitHub'ga yuklanmaydi va shunday qolishi kerak.

## 6. Lokal ishga tushirish

Ikkita terminal oching.

**1-terminal — backend + bot:**

```bash
cd backend
npm install
npm run dev
```

Shunday yozuvlarni ko‘rasiz:

```
🚀 API ishga tushdi: http://localhost:5000
🤖 Bot ishga tushdi (polling): @sizning_bot
   Instagram havolasi: https://t.me/sizning_bot?start=instagram
```

**2-terminal — sayt:**

```bash
cd frontend
npm install
npm run dev
```

Brauzerda oching:

- **Kalkulyator:** http://localhost:5173
- **Admin panel:** http://localhost:5173/admin/login (login va parol — `.env` dagi)

**Testlarni ishga tushirish:**

```bash
cd backend
npm test
```

### Lokal ishda Telegram bot haqida

- Bot lokal kompyuterda ham to‘liq ishlaydi: `/start`, bazaga yozish va adminlarga xabar.
- Lekin Telegram **Web App tugmasi faqat `https://` manzil bilan** ishlaydi. `http://localhost` bilan bot tugma o‘rniga oddiy havola yuboradi.
- Kalkulyatorni Telegram ichida sinash uchun deploy qiling (7-bo‘lim) yoki `cloudflared` tunnelidan foydalaning:

```bash
npx cloudflared tunnel --url http://localhost:5173
```

Chiqqan `https://....trycloudflare.com` manzilini `backend/.env` ga yozing va backendni qayta ishga tushiring:

```env
WEBAPP_URL=https://....trycloudflare.com
```

## 7. Internetga joylash (Render + Vercel)

Avval loyihani GitHub'ga yuklang (https://github.com → New repository):

```bash
cd project
git init
git add .
git commit -m "Kaloriya kalkulyatori"
git branch -M main
git remote add origin https://github.com/USERNAME/kaloriya.git
git push -u origin main
```

### 7.1. Backend → Render

1. https://render.com → **New +** → **Web Service** → GitHub reponi tanlang.
2. Sozlamalar:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. **Environment** bo‘limida `.env` dagi hamma qatorlarni qo‘shing. `FRONTEND_URL` ni hozircha keyinroqqa qoldiring.
4. **Create Web Service** ni bosing. Render sizga manzil beradi, masalan `https://kaloriya-api.onrender.com`.
5. Environment'ga shu qatorni qo‘shing (backend manzilingiz):

```env
WEBHOOK_DOMAIN=https://kaloriya-api.onrender.com
```

Bu qator to‘ldirilsa, bot Renderda webhook rejimida ishlaydi.

6. Tekshirish: brauzerda `https://kaloriya-api.onrender.com/api/health` ni oching. `{"status":"ok"}` chiqishi kerak.

> ⚠️ **JSON ma'lumotlar haqida MUHIM.** Render'ning **bepul** tarifida disk vaqtinchalik. Har deploy yoki qayta ishga tushishda `users.json` va `calculations.json` **o‘chib ketadi**. Mijozlar saqlanib qolishi uchun:
>
> 1. Render'da tarifni **Starter** ga o‘tkazing.
> 2. **Disks** bo‘limida **Add Disk** ni bosing: Mount Path `/var/data`, hajmi 1 GB yetarli.
> 3. Environment'ga `DATA_DIR=/var/data` qo‘shing.
>
> Shundan keyin ma'lumotlar doimiy saqlanadi.
>
> Bepul tarifda server 15 daqiqa faoliyatsizlikdan keyin "uxlaydi". Birinchi `/start` xabariga javob 30–60 soniya kechikishi mumkin. Telegram xabarni qayta yuboradi, shuning uchun xabar yo‘qolmaydi.

### 7.2. Frontend → Vercel

1. https://vercel.com → **Add New** → **Project** → GitHub reponi tanlang.
2. Sozlamalar:
   - **Root Directory:** `frontend` (Edit tugmasi orqali)
   - **Framework Preset:** Vite (o‘zi aniqlaydi)
3. **Environment Variables** ga backend manzilini qo‘shing (oxirida `/` bo‘lmasin):

```env
VITE_API_URL=https://kaloriya-api.onrender.com
```

4. **Deploy** ni bosing. Vercel sizga manzil beradi, masalan `https://kaloriya.vercel.app`.

### 7.3. Ikkalasini bog‘lash

Render → Environment'ga qaytib, shu ikki qatorni qo‘shing:

```env
FRONTEND_URL=https://kaloriya.vercel.app
WEBAPP_URL=https://kaloriya.vercel.app
```

**Save** bosing, Render o‘zi qayta ishga tushadi. Tayyor.

### 7.4. Yakuniy tekshiruv

1. Telegramda `https://t.me/SIZNING_BOT?start=instagram` havolasini oching va **Start** bosing.
2. Ikkala admin "🆕 YANGI MIJOZ ... Source: Instagram" xabarini oladi.
3. "🧮 KALKULYATORNI OCHISH" tugmasini bosing. Sayt Telegram ichida ochiladi.
4. Hisoblang. Adminlar "🧮 YANGI HISOBLASH" xabarini oladi.
5. `https://kaloriya.vercel.app/admin/login` ga kiring. Mijoz va uning hisoblash tarixi ko‘rinadi.

**Instagram uchun havola:**

```
https://t.me/SIZNING_BOT_USERNAME?start=instagram
```

Boshqa manbalar uchun ham shunday havola yasash mumkin: `?start=tiktok`, `?start=youtube`. Admin panelda manba shu nom bilan ko‘rinadi.

## 8. Rasmlarni almashtirish

- **Logo:** `frontend/src/assets/logo.png`
- **Shifokor rasmi:** `frontend/src/assets/doctor.png`

Faylni **xuddi shu nom bilan** almashtiring. `.jpg` yoki `.webp` ham bo‘ladi, masalan `doctor.jpg`. Kodni o‘zgartirish shart emas.

Fayl bo‘lmasa ham sayt buzilmaydi — o‘rniga chiroyli zaxira ko‘rinish chiqadi.

Ism va lavozim matni: `frontend/src/config/brand.js`.

## 9. API

| Metod | Manzil | Kim uchun |
|---|---|---|
| GET | `/api/health` | ochiq |
| POST | `/api/users` | Telegram Web App (imzo bilan) |
| GET | `/api/users?search=&page=&limit=` | admin (JWT) |
| GET | `/api/users/:id` | admin |
| POST | `/api/calculations` | ochiq (daqiqasiga 20 ta cheklov) |
| GET | `/api/calculations?page=&limit=` | admin |
| GET | `/api/calculations/:userId` | admin |
| POST | `/api/auth/login` | ochiq (15 daqiqada 10 ta xato urinish) |
| GET | `/api/admin/stats` | admin |

## 10. Muammolar va yechimlar

| Belgi | Sabab va yechim |
|---|---|
| `❌ .env faylida xatolar bor` | Xabarda ko‘rsatilgan qatorni `backend/.env` da to‘ldiring. |
| `❌ Bot ishga tushmadi: 401` | BOT_TOKEN noto‘g‘ri. BotFather'dan qayta nusxalang. |
| Deploydan keyin bot javob bermay qoldi | Kompyuteringizda xuddi shu BOT_TOKEN bilan `npm run dev` ishga tushirgansiz — lokal bot Render'ning webhook'ini o‘chirib qo‘yadi. Render'da **Manual Deploy → Restart** qiling. Lokal sinov uchun @BotFather'da **alohida test bot** yarating va lokal `.env` ga o‘shaning tokenini yozing. |
| `409 Conflict` (bot) | Bot bir vaqtda ikki joyda polling rejimida ishlayapti. Birini to‘xtating. |
| Adminga xabar kelmaydi | Admin botga `/start` bosmagan yoki ADMIN_ID noto‘g‘ri. Render loglarida `[notify]` qatoriga qarang. |
| Saytda "Serverga ulanib bo‘lmadi" | Vercel'da `VITE_API_URL` noto‘g‘ri yoki Render'da `FRONTEND_URL` Vercel manziliga teng emas. |
| Tugma sayt o‘rniga havola yuboradi | `WEBAPP_URL` `https://` bilan boshlanmagan. |
| Render'da mijozlar o‘chib ketdi | 7.1 dagi Disk va `DATA_DIR` ni sozlang. |
