-- Preserve the enum's identity and its dependent functions and policies.
-- Commit the new value before the following migration uses it in policies.
alter type "public"."user_role" add value if not exists 'workspace-admin';
