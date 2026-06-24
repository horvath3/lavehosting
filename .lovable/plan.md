
# Lave Hosting — Control Panel terv

A Lovable projekt a **teljes vezérlőfelületet** (control panel) építi meg, a tényleges bot-folyamatokat pedig egy **különálló runner backend** futtatja, amit te üzemeltetsz egy VPS-en. A két rendszer HTTP + WebSocket-en kommunikál.

---

## 1. Architektúra

```text
 ┌────────────────────────────┐     HTTPS + WSS      ┌──────────────────────────┐
 │ Lovable app (ez a projekt) │ ───────────────────▶ │ Runner backend (te VPS)  │
 │  • Landing + Dashboard     │                      │  • Node.js + Express     │
 │  • Auth (Lovable Cloud)    │                      │  • Dockerode             │
 │  • DB: Postgres            │                      │  • Socket.IO konzol      │
 │  • File metadata           │                      │  • Per-user containerek  │
 │  • Server CRUD + parancsok │ ◀─── webhookok ───── │  • Fájl I/O a kötetben   │
 └────────────────────────────┘                      └──────────────────────────┘
```

A control panel **sosem futtat** bot kódot — csak parancsokat sorba állít és státuszt jelenít meg. A runner pollozza / WS-en kapja a parancsokat, és visszaírja az eredményt.

---

## 2. Stack (Lovable oldal)

- TanStack Start (React 19 + Vite 7) — file-based routing
- Tailwind v4, Framer Motion, shadcn/ui
- Lovable Cloud: Postgres + Auth + Storage (fájl bináris tárolásra)
- TanStack Query a loaderekben
- Monaco Editor (`@monaco-editor/react`)
- Socket.IO **kliens** — a runner WS endpointjához csatlakozik

---

## 3. Oldalak / route-ok

Publikus:
- `/` — Hero (Lave Hosting / Free Discord Server Hosting), élő statisztikák, CTA-k
- `/services` — Discord Bot Hosting (aktív) + Minecraft / ARK / Farming Sim (Coming soon)
- `/auth` — bejelentkezés + regisztráció (email + jelszó, Google opcionális)

Védett (`_authenticated/`, integration-managed gate):
- `/dashboard` — összegzés: szerverek, erőforrások, értesítések
- `/servers` — lista + új szerver létrehozás (név, leírás, runtime: Node.js / Python)
- `/servers/$id` — egy szerver: státusz, CPU/RAM/disk, uptime, Start/Stop/Restart/Delete
- `/servers/$id/files` — fájlkezelő (fa, upload, drag&drop, ZIP, mappa CRUD)
- `/servers/$id/files/edit` — Monaco editor (auto-save, sorszámok, keresés, fullscreen)
- `/servers/$id/console` — élő színes konzol, parancsküldés (Socket.IO)
- `/account`, `/settings` — profil + jelszó / email
- `/admin` — csak `admin` role: user / szerver kezelés, statisztikák

Sidebar layout `collapsible="icon"` shadcn sidebarral, top bar profilképpel + értesítésekkel.

---

## 4. Adatmodell (Postgres / Lovable Cloud)

- `profiles` (id → auth.users, username, avatar_url, created_at)
- `user_roles` (user_id, role: `admin` | `user`) + `has_role()` security definer fn
- `servers` (id, owner_id, name, description, runtime, status, container_id, cpu/ram/disk limit, created_at)
- `server_metrics` (server_id, cpu_pct, ram_mb, disk_mb, uptime_s, recorded_at) — runner pusholja
- `server_files` (id, server_id, path, size, mime, storage_key, updated_at) — bináris a Lovable Storage-ban
- `server_commands` (id, server_id, kind: start/stop/restart/delete/exec, payload, status: pending/running/done/failed, created_at) — runner queue
- `server_logs` (id, server_id, level, message, ts) — perzisztens log puffer
- `audit_log` (admin műveletekhez)

Minden user-owned tábla RLS-sel: tulajdonos olvas/ír, admin mindent. Service role csak a runner webhookjához.

---

## 5. Server functions (`createServerFn`)

Auth-védett (`requireSupabaseAuth`):
- `listServers`, `getServer`, `createServer`, `deleteServer`
- `enqueueCommand` (start/stop/restart/exec)
- `listFiles`, `uploadFile`, `renameFile`, `deleteFile`, `createFolder`, `extractZip` (csak metadata + Storage művelet; a runner szinkronizál)
- `getFileContent`, `saveFileContent` (Monaco)
- `getMetrics`, `getLogs`

Admin (role check):
- `adminListUsers`, `adminBanUser`, `adminDeleteServer`, `adminStats`

Publikus (`/api/public/runner/*` server route-ok, HMAC `RUNNER_SECRET`-tel aláírva):
- `POST /api/public/runner/poll` — pending parancsok lekérése
- `POST /api/public/runner/ack` — parancs eredmény
- `POST /api/public/runner/metrics` — CPU/RAM/disk push
- `POST /api/public/runner/logs` — log sorok push

---

## 6. Konzol (élő)

A runner Socket.IO szerverén külön namespace per szerver-id, JWT-vel auth-olva (rövid életű token a control panelből).
A `/servers/$id/console` oldal kliensként csatlakozik a runner WS URL-jére, fogadja a stdout/stderr-t (ANSI színek `xterm.js`-szel), és inputot küld vissza. Ha a runner offline, a perzisztens `server_logs` puffert mutatjuk.

---

## 7. Runner backend (specifikáció, nem itt épül)

Külön repo / VPS, Node.js + Express + Dockerode + Socket.IO. Felelős:
- HMAC-vel hív Lovable `/api/public/runner/*` végpontokra
- Per-user Docker konténer (Node.js vagy Python image), CPU/RAM cgroup limit
- Fájlok sync: Lovable Storage ↔ konténer volume
- Stdout pipe → Socket.IO emit + log push
- Metrics 5 másodpercenként push

Szállítok: README + minta `runner/` mappa (Dockerfile, `index.js`, env vars, systemd unit, példa nginx config) referenciaként a Lovable projekt `docs/runner/` alá. Ezt te telepíted a saját szervereden.

---

## 8. Dizájn

Sötét téma, lila (`#7C3AED` / `#A855F7`) + kék (`#3B82F6` / `#06B6D4`) akcentek. Glassmorphism kártyák (`backdrop-blur-xl bg-white/5 border border-white/10`), lebegő gradient blob háttér, Framer Motion belépő animációk és hover scale. Display font **Space Grotesk**, body **Inter** (`@fontsource` csomagokkal). Inspiráció: Pterodactyl + Railway + Vercel. Teljesen reszponzív (mobil sidebar `collapsible="offcanvas"`, deszktopon `icon`).

---

## 9. Biztonság

- Lovable Auth (jelszó hash + JWT a háttérben), HIBP password check bekapcsolva
- RLS minden user-data táblán, `has_role()` adminhoz
- Zod validáció minden server fn inputon
- HMAC + timestamp + nonce a runner webhookokon (replay védelem)
- Ad-hoc IP-alapú throttling a runner endpointokon (a backendnek nincs natív rate-limit primitívje, ezt jelzem)
- `RUNNER_SECRET` és `RUNNER_BASE_URL` titokként tárolva

---

## 10. Felépítés sorrendje (egy menetben)

1. Lovable Cloud bekapcsolás + séma + RLS + `has_role`
2. Auth oldal + `_authenticated` layout + profilok
3. Landing (`/`) + `/services` + dizájnrendszer (tokenek, fontok, animációk)
4. Dashboard shell (sidebar + topbar)
5. Servers CRUD + szerver részletek (mock metrics, amíg runner nincs)
6. Fájlkezelő (Storage + metadata) + Monaco editor
7. Konzol UI (Socket.IO kliens, runner nélkül perzisztens logból olvas)
8. Admin panel
9. `/api/public/runner/*` végpontok HMAC-kel
10. `docs/runner/` referencia implementáció + README a VPS telepítéshez

---

## Mit kérek tőled a build előtt

- A **runner VPS** publikus URL-je (vagy később megadod, addig placeholder)
- Megerősítés, hogy Google sign-in is kell a jelszó mellé (alapból csak email+jelszó lesz, ha nem szólsz)
- Erősítsd meg: Monaco + xterm.js + Socket.IO-client csomagok telepítése OK
