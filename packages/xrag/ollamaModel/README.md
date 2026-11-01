# Create an Ollama model XRAG package

From the repository root, run:

```sh
node packages/xrag/ollamaModel/createXRAG.ts
```

The command downloads the model from the Ollama registry and writes
`packages/xrag/ollamaModel/model.xrag.tar`. Move an existing archive before
running the command again if you need to keep it.

At **Model name**, enter a model and tag, such as `qwen3:0.6b`. The command also
accepts a pasted `ollama run …` or `ollama pull …` command. An omitted tag uses
`latest`.

Enter the display name, choose language or embedding model, and supply its
context size in thousands of tokens (`32` means 32,000). For a language model,
select thinking, tools and vision only when the model supports them. For an
embedding model, choose its vector dimension.

Before answering `y` to **Include description (y/n)**, replace
[description.md](description.md) with text for the model being packaged. Any
other answer omits that file. The optional image URL must return a PNG, JPEG,
GIF, WebP or SVG image.

Install the resulting archive using the web app's
[XRAG upload](../../../docs/de/settings/xrag.md).
