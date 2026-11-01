const FILE_CATEGORY_PLAIN_TEXT = [
  "md",
  "markdown",
  "mdx",
  "txt",
  "text",
  "log",
  "tsv",
  "rtf",
  "ini",
  "cfg",
  "conf",
  "properties",
  "env",
  "gitignore",
  "editorconfig",
];

const FILE_CATEGORY_IMAGE = [
  "jpg",
  "jpeg",
  "jpe",
  "jfif",
  "png",
  "gif",
  "webp",
  "avif",
  "svg",
  "svgz",
  "bmp",
  "dib",
  "ico",
  "tif",
  "tiff",
  "heic",
  "heif",
  "raw",
  "psd",
  "ai",
];

const FILE_CATEGORY_RICH_TEXT = [
  "pdf",
  "doc",
  "docx",
  "docm",
  "dot",
  "dotx",
  "odt",
  "ott",
  "pages",
  "epub",
  "mobi",
  "azw",
  "azw3",
];

const FILE_CATEGORY_SPREADSHEET = [
  "csv",
  "xls",
  "xlsx",
  "xlsm",
  "xlsb",
  "xlt",
  "xltx",
  "xltm",
  "ods",
  "ots",
  "numbers",
];

const FILE_CATEGORY_PRESENTATION = [
  "ppt",
  "pptx",
  "pptm",
  "pps",
  "ppsx",
  "ppsm",
  "pot",
  "potx",
  "potm",
  "odp",
  "otp",
  "key",
];

const FILE_CATEGORY_CODE = [
  // Web / frontend
  "htm",
  "html",
  "xhtml",
  "css",
  "scss",
  "sass",
  "less",
  "vue",
  "svelte",
  "astro",

  // JavaScript / TypeScript
  "js",
  "jsx",
  "cjs",
  "mjs",
  "ts",
  "tsx",
  "mts",
  "cts",

  // Data / configuration
  "json",
  "jsonc",
  "json5",
  "yaml",
  "yml",
  "toml",
  "xml",
  "graphql",
  "gql",
  "env",
  "ini",
  "cfg",
  "conf",

  // Backend / general purpose
  "py",
  "pyw",
  "java",
  "kt",
  "kts",
  "cs",
  "go",
  "rs",
  "rb",
  "php",
  "swift",
  "scala",
  "dart",
  "r",
  "lua",
  "pl",
  "pm",
  "ex",
  "exs",
  "erl",
  "hrl",

  // C family / systems
  "c",
  "h",
  "cpp",
  "cxx",
  "cc",
  "hpp",
  "hxx",
  "m",
  "mm",

  // Shell / scripting
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "bat",
  "cmd",

  // SQL / infrastructure
  "sql",
  "prisma",
  "dockerfile",
  "tf",
  "tfvars",
  "hcl",
  "nix",

  // Other
  "vim",
  "vimrc",
  "emacs",
  "tex",
  "sol",
  "zig",
];

const FILE_CATEGORY_AUDIO = [
  // Audio
  "wav",
  "mp3",
  "m4a",
  "aac",
  "ogg",
  "oga",
  "opus",
  "flac",
  "aiff",
  "aif",
  "wma",
  "amr",
  "weba",
];

const FILE_CATEGORY_VIDEO = [
  // Video
  "mp4",
  "m4v",
  "mov",
  "avi",
  "mkv",
  "webm",
  "mpeg",
  "mpg",
  "mpe",
  "3gp",
  "3g2",
  "wmv",
  "flv",
  "ogv",
  //   "ts",
  "m2ts",
];

const categoryPlainText = new Set(FILE_CATEGORY_PLAIN_TEXT);
const categoryImage = new Set(FILE_CATEGORY_IMAGE);
const categoryRichText = new Set(FILE_CATEGORY_RICH_TEXT);
const categorySpreadsheet = new Set(FILE_CATEGORY_SPREADSHEET);
const categoryPresentation = new Set(FILE_CATEGORY_PRESENTATION);
const categoryCode = new Set(FILE_CATEGORY_CODE);
const categoryAudio = new Set(FILE_CATEGORY_AUDIO);
const categoryVideo = new Set(FILE_CATEGORY_VIDEO);

export function getFileCategory(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();

  if (extension) {
    if (categoryPlainText.has(extension)) {
      return "plain-text" as const;
    }

    if (categoryImage.has(extension)) {
      return "image" as const;
    }

    if (categoryRichText.has(extension)) {
      return "rich-text" as const;
    }

    if (categorySpreadsheet.has(extension)) {
      return "spreadsheet" as const;
    }

    if (categoryPresentation.has(extension)) {
      return "presentation" as const;
    }

    if (categoryCode.has(extension)) {
      return "code" as const;
    }

    if (categoryAudio.has(extension)) {
      return "audio" as const;
    }

    if (categoryVideo.has(extension)) {
      return "video" as const;
    }
  }

  return "unknown" as const;
}

export function fileNeedsProcessing(path: string) {
  // HTML needs text extraction just like PDFs; reading its source exposes markup.
  if (/\.(?:html?|xhtml)$/i.test(path)) return "text" as const;

  const category = getFileCategory(path);

  switch (category) {
    case "image":
    case "rich-text":
    case "spreadsheet":
    case "presentation":
      return "text" as const;
    case "audio":
    case "video":
      return "transcript" as const;
  }

  return undefined;
}
