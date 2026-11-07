-- Local development only. No production data or external credentials.
-- Reset is intentionally interactive through npm run seed:reset.
-- Stable UUIDs use the same ID format as application-created resources.
BEGIN;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1b00000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'demo@aibox.test', extensions.crypt('Aibox-local-demo-2026!', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}',
  '{"first_name":"Demo","last_name":"Admin"}', now(), now(), '', '', '', ''
);
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a1b00000-0000-4000-8000-000000000002',
  'a1b00000-0000-4000-8000-000000000001',
  'a1b00000-0000-4000-8000-000000000001',
  '{"sub":"a1b00000-0000-4000-8000-000000000001","email":"demo@aibox.test","email_verified":true,"phone_verified":false}',
  'email', now(), now(), now()
);
-- The existing handle_new_user trigger creates the profile and first admin.
INSERT INTO public.user_roles (user_id, role)
SELECT 'a1b00000-0000-4000-8000-000000000001', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = 'a1b00000-0000-4000-8000-000000000001' AND role = 'admin' AND organization_id IS NULL);

INSERT INTO public.organizations (id, name, description, auto_join)
VALUES ('a1b00000-0000-4000-8000-000000000010', 'Lokale Entwicklung', '{"version":"workspace-config-v1","description":"Reproduzierbare lokale Beispieldaten","documentation":"Agent, Dokumentenablage und Transkription für lokale Funktionstests."}', true);

-- Diese drei lokalen Modelle decken die Karten und Detailseiten unter /models ab.
-- Externe Modelle werden dort mit eigenen Anbieterzugängen hinzugefügt; keine API-Schlüssel im Seed.
INSERT INTO public.ai_models (id, identifier, name, type, config) VALUES
('a1b00000-0000-4000-8000-000000000011', 'qwen3:0.6b', 'Qwen3 0.6B lokal', 'ollama_llm_v1', '{"ollamaIdentifier":"qwen3:0.6b","contextSize":4096,"featureThinking":true,"featureTools":true,"featureVision":false}'),
('a1b00000-0000-4000-8000-000000000012', 'nomic-embed-text', 'Nomic Embed Text lokal', 'ollama_embedding_v1', '{"ollamaIdentifier":"nomic-embed-text","contextSize":2048,"embeddingVectorSize":768}'),
('a1b00000-0000-4000-8000-000000000013', 'whisper-tiny', 'Whisper Tiny lokal', 'mlx_whisper_v1', '{"fileSystemIdentifier":"whisper-tiny"}');

INSERT INTO public.transcribers (id, name, description, organization_id, config)
VALUES ('a1b00000-0000-4000-8000-000000000014', 'Lokale Transkription', 'Whisper Tiny auf Apple Silicon', 'a1b00000-0000-4000-8000-000000000010', '{"version":"transcriber-v2","identifier":"lokal-whisper","modelIdentifier":"whisper-tiny","retryLevel":"balanced","icon":{"type":"icon-lucide","iconName":"mic"},"color":{"type":"color-oklch-hue","oklchHue":180}}');

INSERT INTO public.databases (id, name, description, organization_id, config)
VALUES ('a1b00000-0000-4000-8000-000000000015', 'Lokale Testdokumente', 'Ablage für Upload-, Such- und Embedding-Tests', 'a1b00000-0000-4000-8000-000000000010', '{"type":"database-v2","identifier":"lokale-testdokumente","index":{"embedding":{"active":true,"modelIdentifier":"nomic-embed-text","modelVectorSize":768},"keyword":{"active":true}},"transcriberIdentifier":"lokal-whisper"}');

INSERT INTO public.chatbots (id, name, description, organization_id, visibility, roles, config)
VALUES ('a1b00000-0000-4000-8000-000000000016', 'Lokaler Testagent', 'Lokaler Ollama-Assistent mit Zugriff auf die Testdokumente', 'a1b00000-0000-4000-8000-000000000010', 'public', '{}',
$agent${
  "version": "agent-config-version-4",
  "modelIdentifier": "qwen3:0.6b",
  "modelThinking": "mandatory-off",
  "transcriberIdentifier": "lokal-whisper",
  "color": {"type": "color-oklch-hue", "oklchHue": 240},
  "icon": {"type": "icon-lucide", "iconName": "bot"},
  "documentation": "Benötigt Ollama mit qwen3:0.6b. Dokumente können in Lokale Testdokumente hochgeladen werden.",
  "additionalFunctions": {"batch": true, "disappearingChats": true, "fileUpload": true, "nightshift": true, "pursueGoal": true},
  "recommendedMessages": [{"id": "a1b00000-0000-4000-8000-000000000018", "label": "Ausprobieren", "message": "Erkläre kurz, wobei du mir helfen kannst."}],
  "roles": [{
    "id": "a1b00000-0000-4000-8000-000000000003",
    "name": "Assistent",
    "prompt": "Du bist ein hilfreicher Assistent. Antworte kurz und auf Deutsch.",
    "documentRepositoryMounts": [{"id": "a1b00000-0000-4000-8000-000000000004", "documentRepositoryIdentifier": "lokale-testdokumente", "mount": "/default", "pathRepository": "/", "permission": "read-only"}],
    "toolPlatformAccess": {"active": true, "level": "workspace", "approvals": {"user": "auto", "editor": "auto", "workspace": "ask", "admin": "off"}},
    "toolCalculator": {"active": true}
  }]
}$agent$::jsonb);

-- OAuth credentials are deliberately not seeded: every user connects their own account.
INSERT INTO public.chatbots (id, name, description, organization_id, visibility, roles, config)
VALUES ('a1b00000-0000-4000-8000-000000000017', 'Trello-Testagent', 'Trello MCP mit persönlicher OAuth-Anmeldung', 'a1b00000-0000-4000-8000-000000000010', 'public', '{}',
$trello${
  "version": "agent-config-version-4",
  "modelIdentifier": "qwen3:0.6b",
  "modelThinking": "mandatory-off",
  "color": {"type": "color-oklch-hue", "oklchHue": 240},
  "icon": {"type": "icon-lucide", "iconName": "bot"},
  "documentation": "Benötigt ein eigenes Trello-Konto und eine persönliche OAuth-Anmeldung im Chat. Für zuverlässige Werkzeugaufrufe ein geeignetes Modell auswählen.",
  "additionalFunctions": {"batch": false, "disappearingChats": true, "fileUpload": false, "nightshift": false, "pursueGoal": false},
  "recommendedMessages": [],
  "roles": [{
    "id": "a1b00000-0000-4000-8000-000000000005",
    "name": "Trello",
    "prompt": "Hilf mit Trello. Frage vor Änderungen an Boards oder Karten nach einer Bestätigung.",
    "documentRepositoryMounts": [],
    "mcps": [{"id": "a1b00000-0000-4000-8000-000000000006", "name": "Trello", "type": "http", "url": "https://mcp.trello.com/v1", "headers": {}}]
  }]
}$trello$::jsonb);

INSERT INTO public.system_settings (key, value) VALUES
('defaultModel', '{"version":"default-model-v2","modelIdentifier":"qwen3:0.6b"}'),
('signIn', '{"password":"visible","sso":"hidden"}'),
('welcomeMessage', '{"localized":{"de":"# Lokale Testumgebung\n\nDiese Aibox enthält ausschließlich Beispieldaten für Entwicklung und Tests.\n\n**E-Mail:** demo@aibox.test\n\n**Passwort:** Aibox-local-demo-2026!\n\nDer Demo-Zugang hat Administratorrechte. Mit npm run seed:reset werden die lokalen Daten gelöscht und die Beispieldaten wiederhergestellt.","en":"# Local test environment\n\nThis Aibox contains example data for development and testing only.\n\n**Email:** demo@aibox.test\n\n**Password:** Aibox-local-demo-2026!\n\nThe demo account has administrator access. Running npm run seed:reset deletes local data and restores the examples."}}');
COMMIT;
