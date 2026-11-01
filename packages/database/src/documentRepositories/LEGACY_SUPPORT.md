# Legacy support

`mapDocumentRepositoryWithLegacySupportCleanUp` converts older configurations to
`database-v2` in memory when they are read. Its database update is commented out,
so reading a repository leaves `databases.config` in its stored format.

Before removing this compatibility path, migrate the stored configurations,
verify that every `databases.config.type` is `database-v2`, and check that the
keyword and embedding index settings survive the conversion.
