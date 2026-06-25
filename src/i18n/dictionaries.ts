export type Locale = "hu" | "en";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

type Dict = Record<string, string>;

const en: Dict = {
  // Marketing
  "marketing.tagline": "Now in public beta — Free forever tier",
  "marketing.hero.subtitle": "Free Discord Bot Hosting",
  "marketing.hero.body":
    "Create and manage Discord bot servers in seconds. Upload your code, hit start, and watch the console light up in real time.",
  "marketing.cta.create": "Create Server",
  "marketing.cta.dashboard": "Dashboard",
  "marketing.cta.signin": "Sign in",
  "marketing.cta.getStarted": "Get started",
  "marketing.nav.home": "Home",
  "marketing.nav.services": "Services",
  "marketing.nav.features": "Features",
  "marketing.stats.activeServers": "Active Servers",
  "marketing.stats.users": "Registered Users",
  "marketing.stats.running": "Running Servers",
  "marketing.stats.uptime": "Uptime",
  "marketing.features.title": "Everything your bot needs",
  "marketing.features.subtitle": "Production-grade primitives, packaged in a control panel that feels great.",
  "marketing.cta.bottom.title": "Ship your bot in",
  "marketing.cta.bottom.title2": "60 seconds",
  "marketing.cta.bottom.body": "Create an account, spin up a server, paste your code. We handle the rest.",
  "marketing.cta.bottom.button": "Get started free",
  "marketing.services.title": "Hosting that grows with you",
  "marketing.services.subtitle": "Start with Discord bots. More game servers landing soon.",
  "marketing.services.available": "Available now",
  "marketing.services.coming": "Coming soon",

  // Dashboard
  "nav.dashboard": "Dashboard",
  "dash.welcome": "Welcome back,",
  "dash.subtitle": "Here's what's happening with your servers.",
  "dash.newServer": "New server",
  "dash.total": "Total servers",
  "dash.running": "Running",
  "dash.stopped": "Stopped",
  "dash.quota": "Quota",
  "dash.yourServers": "Your servers",
  "dash.viewAll": "View all",
  "dash.empty.title": "No servers yet",
  "dash.empty.body": "Spin up your first Discord bot in under a minute.",
  "dash.empty.cta": "Create your first server",

  // Servers
  "servers.title": "Servers",
  "servers.subtitle": "Spin up and manage your Discord bot instances.",
  "servers.create": "Create server",
  "servers.create.title": "Create a new server",
  "servers.create.name": "Server name",
  "servers.create.desc": "Description (optional)",
  "servers.create.runtime": "Runtime",
  "servers.empty.title": "No servers yet",
  "servers.empty.body": "Create your first server to get started.",
  "servers.manage": "Manage",
  "servers.delete.title": "Delete",
  "servers.delete.body": "This permanently removes the server, all files, logs and metrics. This cannot be undone.",
  "servers.delete.cancel": "Cancel",
  "servers.delete.confirm": "Delete",

  // Status
  "status.running": "Running",
  "status.stopped": "Stopped",
  "status.starting": "Starting",
  "status.stopping": "Stopping",
  "status.crashed": "Crashed",
  "status.creating": "Creating",
  "status.deleting": "Deleting",

  // Server tabs
  "server.tab.overview": "Overview",
  "server.tab.files": "Files",
  "server.tab.console": "Console",
  "server.tab.settings": "Settings",
  "server.back": "Back to servers",

  // Files
  "files.newFolder": "New folder",
  "files.upload": "Upload files",
  "files.uploadFolder": "Upload folder",
  "files.allowed": "Allowed: {types} · 2 MB / file",
  "files.empty": "No files yet — drop files here or upload above.",
  "files.dropHere": "Drop files or folders here",
  "files.uploaded": "Uploaded {name}",
  "files.uploadFailed": "Upload failed: {msg}",
  "files.skipped": "{name}: type {ext} not allowed",
  "files.tooLarge": "{name}: max 2 MB",
  "files.deleted": "Deleted",
  "files.renamed": "Renamed",
  "files.renamePrompt": "Rename to:",
  "files.deletePrompt": "Delete {path}?",
  "files.folderCreated": "Folder created",
  "files.uploadingFolder": "Uploading {count} files…",
  "files.folderDone": "Uploaded {ok} of {total} files",

  // Provisioning
  "provision.title": "Server installation",
  "provision.subtitle": "Your server is being set up. This typically takes {min}–{max} minutes.",
  "provision.step.queue": "Queued for provisioning…",
  "provision.step.allocate": "Allocating compute resources…",
  "provision.step.image": "Preparing runtime image…",
  "provision.step.deps": "Configuring runtime dependencies…",
  "provision.step.network": "Configuring secure networking…",
  "provision.step.storage": "Mounting persistent storage…",
  "provision.step.finalize": "Finalizing installation…",
  "provision.step.ready": "Ready!",
  "provision.checkStatus": "Check status",
  "provision.deleteServer": "Delete server",
  "provision.overloadNote":
    "If installation takes longer than {min} minutes, the server may be stuck. You can delete it and create a new one.",

  // Account / settings
  "account.title": "Account",
  "account.subtitle": "Manage your profile information.",
  "account.email": "Email",
  "account.displayName": "Display name",
  "account.username": "Username",
  "account.role": "Role",
  "account.save": "Save",
  "account.updated": "Profile updated",
  "account.language": "Language",
  "account.languageHint": "Choose your preferred language for the interface.",

  "settings.title": "Settings",
  "settings.subtitle": "Security and preferences.",
  "settings.changePassword": "Change password",
  "settings.newPassword": "New password",
  "settings.confirm": "Confirm",
  "settings.update": "Update password",
  "settings.passwordUpdated": "Password updated",

  // Admin
  "admin.title": "Admin panel",
  "admin.subtitle": "Platform-wide management.",
  "admin.users": "Users",
  "admin.servers": "Servers",
  "admin.running": "Running",
  "admin.settings": "Settings",
  "admin.provisioning.title": "Server installation animation",
  "admin.provisioning.body":
    "Controls the simulated server installation duration shown to users while they wait.",
  "admin.provisioning.min": "Minimum seconds",
  "admin.provisioning.max": "Maximum seconds",
  "admin.provisioning.overload": "Overload threshold (seconds)",
  "admin.provisioning.save": "Save settings",
  "admin.provisioning.saved": "Settings saved",

  // Topbar
  "topbar.account": "Account",
  "topbar.settings": "Settings",
  "topbar.signout": "Sign out",
  "topbar.signedOut": "Signed out",
};

const hu: Dict = {
  "marketing.tagline": "Most nyilvános bétában — Örökre ingyenes csomag",
  "marketing.hero.subtitle": "Ingyenes Discord Bot Hosting",
  "marketing.hero.body":
    "Hozz létre és kezelj Discord bot szervereket másodpercek alatt. Töltsd fel a kódod, indítsd el, és figyeld a konzolt valós időben.",
  "marketing.cta.create": "Szerver létrehozása",
  "marketing.cta.dashboard": "Vezérlőpult",
  "marketing.cta.signin": "Bejelentkezés",
  "marketing.cta.getStarted": "Kezdjük el",
  "marketing.nav.home": "Kezdőlap",
  "marketing.nav.services": "Szolgáltatások",
  "marketing.nav.features": "Funkciók",
  "marketing.stats.activeServers": "Aktív szerverek",
  "marketing.stats.users": "Regisztrált felhasználók",
  "marketing.stats.running": "Futó szerverek",
  "marketing.stats.uptime": "Rendelkezésre állás",
  "marketing.features.title": "Minden, amire a botodnak szüksége van",
  "marketing.features.subtitle":
    "Produkciós szintű alapok, prémium vezérlőpultban összerakva.",
  "marketing.cta.bottom.title": "Indítsd el a botod",
  "marketing.cta.bottom.title2": "60 másodperc alatt",
  "marketing.cta.bottom.body":
    "Hozz létre fiókot, indíts szervert, illeszd be a kódod. A többit mi intézzük.",
  "marketing.cta.bottom.button": "Ingyenes indítás",
  "marketing.services.title": "Hosting, ami veled együtt nő",
  "marketing.services.subtitle":
    "Indulj Discord botokkal. További játékszerverek hamarosan.",
  "marketing.services.available": "Most elérhető",
  "marketing.services.coming": "Hamarosan",

  "nav.dashboard": "Vezérlőpult",
  "dash.welcome": "Üdv újra,",
  "dash.subtitle": "Itt láthatod, mi történik a szervereiddel.",
  "dash.newServer": "Új szerver",
  "dash.total": "Összes szerver",
  "dash.running": "Futó",
  "dash.stopped": "Leállítva",
  "dash.quota": "Kvóta",
  "dash.yourServers": "A szervereid",
  "dash.viewAll": "Összes megtekintése",
  "dash.empty.title": "Még nincs szervered",
  "dash.empty.body": "Indítsd el az első Discord botod egy perc alatt.",
  "dash.empty.cta": "Első szerver létrehozása",

  "servers.title": "Szerverek",
  "servers.subtitle": "Indíts és kezelj Discord bot példányokat.",
  "servers.create": "Szerver létrehozása",
  "servers.create.title": "Új szerver létrehozása",
  "servers.create.name": "Szerver neve",
  "servers.create.desc": "Leírás (opcionális)",
  "servers.create.runtime": "Futtatókörnyezet",
  "servers.empty.title": "Még nincs szervered",
  "servers.empty.body": "Hozd létre az első szervered az indításhoz.",
  "servers.manage": "Kezelés",
  "servers.delete.title": "Törlés",
  "servers.delete.body":
    "Ez véglegesen törli a szervert, az összes fájlt, naplót és metrikát. Ez nem visszavonható.",
  "servers.delete.cancel": "Mégse",
  "servers.delete.confirm": "Törlés",

  "status.running": "Fut",
  "status.stopped": "Leállítva",
  "status.starting": "Indítás",
  "status.stopping": "Leállítás",
  "status.crashed": "Összeomlott",
  "status.creating": "Létrehozás",
  "status.deleting": "Törlés",

  "server.tab.overview": "Áttekintés",
  "server.tab.files": "Fájlok",
  "server.tab.console": "Konzol",
  "server.tab.settings": "Beállítások",
  "server.back": "Vissza a szerverekhez",

  "files.newFolder": "Új mappa",
  "files.upload": "Fájlok feltöltése",
  "files.uploadFolder": "Mappa feltöltése",
  "files.allowed": "Engedélyezett: {types} · 2 MB / fájl",
  "files.empty": "Még nincsenek fájlok — húzz ide fájlokat vagy tölts fel.",
  "files.dropHere": "Húzz ide fájlokat vagy mappákat",
  "files.uploaded": "{name} feltöltve",
  "files.uploadFailed": "Sikertelen feltöltés: {msg}",
  "files.skipped": "{name}: a {ext} típus nem engedélyezett",
  "files.tooLarge": "{name}: max 2 MB",
  "files.deleted": "Törölve",
  "files.renamed": "Átnevezve",
  "files.renamePrompt": "Átnevezés erre:",
  "files.deletePrompt": "Törlöd ezt: {path}?",
  "files.folderCreated": "Mappa létrehozva",
  "files.uploadingFolder": "{count} fájl feltöltése…",
  "files.folderDone": "{ok} / {total} fájl feltöltve",

  "provision.title": "Szerver telepítése",
  "provision.subtitle":
    "A szervered beállítása folyamatban. Ez általában {min}–{max} percig tart.",
  "provision.step.queue": "Telepítési sorba állítva…",
  "provision.step.allocate": "Erőforrások lefoglalása…",
  "provision.step.image": "Futtatókörnyezet előkészítése…",
  "provision.step.deps": "Függőségek konfigurálása…",
  "provision.step.network": "Biztonságos hálózat beállítása…",
  "provision.step.storage": "Perzisztens tároló csatolása…",
  "provision.step.finalize": "Telepítés véglegesítése…",
  "provision.step.ready": "Kész!",
  "provision.checkStatus": "Állapot ellenőrzése",
  "provision.deleteServer": "Szerver törlése",
  "provision.overloadNote":
    "Ha a telepítés tovább tart, mint {min} perc, a szerver elakadhatott. Töröld, és hozz létre egy újat.",

  "account.title": "Fiók",
  "account.subtitle": "Profil adataid kezelése.",
  "account.email": "E-mail",
  "account.displayName": "Megjelenített név",
  "account.username": "Felhasználónév",
  "account.role": "Szerep",
  "account.save": "Mentés",
  "account.updated": "Profil frissítve",
  "account.language": "Nyelv",
  "account.languageHint": "Válaszd ki a felület előnyben részesített nyelvét.",

  "settings.title": "Beállítások",
  "settings.subtitle": "Biztonság és preferenciák.",
  "settings.changePassword": "Jelszó módosítása",
  "settings.newPassword": "Új jelszó",
  "settings.confirm": "Megerősítés",
  "settings.update": "Jelszó frissítése",
  "settings.passwordUpdated": "Jelszó frissítve",

  "admin.title": "Admin panel",
  "admin.subtitle": "Platform-szintű kezelés.",
  "admin.users": "Felhasználók",
  "admin.servers": "Szerverek",
  "admin.running": "Futó",
  "admin.settings": "Beállítások",
  "admin.provisioning.title": "Szerver telepítési animáció",
  "admin.provisioning.body":
    "A felhasználóknak megjelenő, szimulált telepítési idő hosszát szabályozza.",
  "admin.provisioning.min": "Minimum másodperc",
  "admin.provisioning.max": "Maximum másodperc",
  "admin.provisioning.overload": "Túlterhelt küszöb (másodperc)",
  "admin.provisioning.save": "Beállítások mentése",
  "admin.provisioning.saved": "Beállítások mentve",

  "topbar.account": "Fiók",
  "topbar.settings": "Beállítások",
  "topbar.signout": "Kijelentkezés",
  "topbar.signedOut": "Kijelentkeztél",
};

export const DICTS: Record<Locale, Dict> = { en, hu };

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[locale] ?? DICTS.hu;
  let str = dict[key] ?? DICTS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}
