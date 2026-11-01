# Legacy support

`mapAgentWithLegacySupportCleanUp` converts older configurations to
`agent-config-version-4` when they are read and attempts to save the converted
configuration in `chatbots.config`. Unread rows remain in their old format, and
the mapper currently does not check the update result.

Before removing the compatibility path, migrate all remaining rows and verify
that every `chatbots.config.version` is `agent-config-version-4`.

# Chatbots are now called Agents

- Database should be backwards compatible, therefore `chatbots` will stay in the database layer
- Outside of Supabase it should be always called `agent`/`agents`
