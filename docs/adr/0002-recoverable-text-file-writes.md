# Recover text edits with a durable undo record

Storage cannot atomically replace a text file and its Markdown history sidecar.
For [FIND-009](https://trello.com/c/Mvv4jLuS), text edits therefore persist both
previous blobs in a versioned `.__xrag_text_write.json` sidecar before writing,
and delete that record only after both replacements succeed. This preserves
existing original-file paths and history formats while allowing recovery after
a failed write or process exit.

While the record exists, application reads and downloads return its previous
blobs. The next text edit or processing task restores those blobs under the
existing file lease before continuing; failed restoration retains the record.
Copying, renaming and unrelated overwrites reject an unfinished write, and file
deletion includes the record. Realtime success is published only after commit.

The trade-off is an extra read for text content and temporary duplication of the
original and its history. Recovery restores the exact previous bytes, including
pre-existing differences between legacy originals and sidecars; it does not
retroactively repair those differences. Direct access to raw Storage objects
bypasses the application's read behavior, so this is a recoverable application
write protocol, not a transaction across Storage objects.
