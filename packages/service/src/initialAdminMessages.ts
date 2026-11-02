const en = {
  help: "Create the first administrator interactively (empty instance only)",
  prompt: "Email for the first administrator (Enter to skip): ",
  invalidEmail: "Enter a valid email address, or press Enter to skip.",
  skipped: "Administrator setup skipped. Run this later:",
  existing: "Users already exist. No accounts or permissions were changed.",
  configuration:
    "Administrator setup requires Core, a Supabase connection with private credentials, and a valid SITE_URL.",
  failed:
    "Administrator setup failed. Check that Supabase is running and its migrations are complete, then retry:",
  cleanupFailed:
    "Account setup could not be completed or rolled back. Inspect the instance's users before retrying. No credentials were displayed.",
  created: "First administrator created. Set your password in the browser:",
  email: "Email:",
  key: "One-time key:",
  instructions:
    "Enter your email, this key and your new password. The key expires after 7 days; keep it private. No email is sent. Then sign in with your email and password.",
};

const de: Record<keyof typeof en, string> = {
  help: "Ersten Administrator interaktiv anlegen (nur bei leerer Instanz)",
  prompt:
    "E-Mail-Adresse für den ersten Administrator (Enter zum Überspringen): ",
  invalidEmail:
    "Gib eine gültige E-Mail-Adresse ein oder drücke Enter zum Überspringen.",
  skipped:
    "Admin-Einrichtung übersprungen. Später mit diesem Befehl nachholen:",
  existing:
    "Es sind bereits Benutzer vorhanden. Konten und Berechtigungen wurden nicht verändert.",
  configuration:
    "Die Admin-Einrichtung benötigt Core, eine Supabase-Verbindung mit privaten Zugangsdaten und eine gültige SITE_URL.",
  failed:
    "Die Admin-Einrichtung ist fehlgeschlagen. Prüfe, ob Supabase läuft und die Migrationen abgeschlossen sind. Danach erneut ausführen:",
  cleanupFailed:
    "Die Kontoanlage konnte weder abgeschlossen noch rückgängig gemacht werden. Prüfe vor einem erneuten Versuch die Benutzer der Instanz. Es wurden keine Zugangsdaten ausgegeben.",
  created:
    "Erster Administrator angelegt. Lege jetzt dein Passwort im Browser fest:",
  email: "E-Mail-Adresse:",
  key: "Einmaliger Schlüssel:",
  instructions:
    "Gib deine E-Mail-Adresse, diesen Schlüssel und dein neues Passwort ein. Der Schlüssel gilt 7 Tage; bewahre ihn vertraulich auf. Es wird keine E-Mail versendet. Melde dich anschließend mit E-Mail-Adresse und Passwort an.",
};

export function initialAdminMessages(environment = process.env) {
  const locale =
    environment.LC_ALL ||
    environment.LC_MESSAGES ||
    environment.LANG ||
    Intl.DateTimeFormat().resolvedOptions().locale;
  return /^de(?:[_\-.]|$)/i.test(locale) ? de : en;
}
