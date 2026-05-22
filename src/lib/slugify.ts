// src/lib/slugify.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining accents
    .replace(/[^a-z0-9\s]/g, '')       // remove non-alphanumeric
    .trim()
    .replace(/\s+/g, '-')              // spaces to hyphens
    .replace(/-+/g, '-')               // collapse consecutive hyphens
}
