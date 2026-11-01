import { getServiceFixture } from "../../service-fixtures";
import { adaptFixture, scenarioState } from "../../scenario";
export const getCurrentUser = async () =>
  getServiceFixture(
    "getCurrentUser",
    adaptFixture(
      {
        id: "11111111-1111-4111-8111-111111111111",
        app_metadata: {
          provider: "11111111-1111-4111-8111-111111111111",
          providers: ["11111111-1111-4111-8111-111111111111"],
        },
        user_metadata: {},
        aud: "Beispiel",
        confirmation_sent_at: "Beispiel",
        recovery_sent_at: "Beispiel",
        email_change_sent_at: "Beispiel",
        new_email: "Beispiel",
        new_phone: "Beispiel",
        invited_at: "Beispiel",
        action_link: "Beispiel",
        email: "alex@example.test",
        phone: "Beispiel",
        created_at: "Beispiel",
        confirmed_at: "Beispiel",
        email_confirmed_at: "Beispiel",
        phone_confirmed_at: "Beispiel",
        last_sign_in_at: "Beispiel",
        role: "Beispiel",
        updated_at: "Beispiel",
        identities: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            user_id: "11111111-1111-4111-8111-111111111111",
            identity_data: {},
            identity_id: "11111111-1111-4111-8111-111111111111",
            provider: "11111111-1111-4111-8111-111111111111",
            created_at: "Beispiel",
            last_sign_in_at: "Beispiel",
            updated_at: "Beispiel",
          },
        ],
        is_anonymous: false,
        is_sso_user: false,
        factors: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            friendly_name: "Beispiel",
            factor_type: "totp",
            status: "verified",
            created_at: "Beispiel",
            updated_at: "Beispiel",
            last_challenged_at: "Beispiel",
          },
        ],
        deleted_at: "Beispiel",
        banned_until: "Beispiel",
      },
      scenarioState.current,
    ),
  );
