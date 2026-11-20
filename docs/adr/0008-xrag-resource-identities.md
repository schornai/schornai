# Preserve logical XRAG identities across workspaces

XRAG object IDs identify logical resources independently of archive checksums and
installation-local database IDs. [Identity helpers](../../packages/xrag/src/identity.ts)
derive model UUIDv8 identities from their shared identifier and predict local imported IDs from the target workspace,
resource kind and origin ID. The [private origin map and import transaction](../../supabase/migrations/20261115133603_xrag_import_export.sql)
preserve the source identity on re-export and take precedence over predicted IDs.
This supports importing dependencies at different times and importing the same
object into multiple workspaces without ambiguous runtime identifiers. Reusing the
origin as the database primary key would prevent those separate workspace copies;
assigning an unrelated random ID on every import would break delayed references.

Import previews use an opaque revision of the existing database row. The transaction
locks the target workspace and affected rows and compares that revision before
writing metadata and identity mappings together. A stale confirmation fails rather
than replacing newer edits. The shared import coordinator authorizes the entire
flattened package before target mutations and invokes this transaction only after
conflict confirmation. Files are installed before the metadata commit. [Import recovery](0010-recoverable-xrag-imports.md) restores replaced files if the transaction fails.

Resource identities default to a readable kebab-case title, with a deterministic
suffix for collisions within the workspace. Lowercase letters, digits, hyphens,
slashes and underscores are allowed. This favors user-controlled portable names
over opaque random identifiers; identical names from unrelated installations can
therefore conflict and require the existing explicit import confirmation. Renaming
a title does not silently change an established identity.

Administrators may change a resource's global identifier through an authorized operation
that compares the displayed previous identifier. This updates the private origin map for
future exports and references, without changing local runtime IDs or old archives.
Keeping old aliases would make two distinct uploaded identities silently target the
same resource; instead, previously exported files retain their original identity.

Resource moves update the origin-map workspace in the same database transaction
through narrowly scoped triggers. Imports preserve existing runtime identifiers,
which may differ from database IDs; references use the saved identifier while
new resources use the predicted local ID. This avoids breaking existing callers
when replacing an exported native object.
