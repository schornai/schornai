export function sanitizeFileName(name: string) {
  // BUG https://github.com/supabase/storage/issues/133

  let sanitizedName = '';

  for (const char of name) {
    switch (char) {
      case 'ä':
        sanitizedName += 'ae';
        break;
      case 'ö':
        sanitizedName += 'oe';
        break;
      case 'ü':
        sanitizedName += 'ue';
        break;
      case 'ß':
        sanitizedName += 'ss';
        break;
      case 'Ä':
        sanitizedName += 'Ae';
        break;
      case 'Ö':
        sanitizedName += 'Oe';
        break;
      case 'Ü':
        sanitizedName += 'Ue';
        break;
      default:
        sanitizedName += char.match(/[a-zA-Z0-9._-]/i) ? char : '_';
        break;
    }
  }

  return sanitizedName;
}
