// Design coordinate width. Every element x/y/w/h is relative to a section that
// is STAGE_W wide. The editor renders the stage 1:1; the public page and mobile
// preview scale this same stage to their target width (full-bleed / phone).
export const STAGE_W = 900

export const MIN_SECTION_H = 160
export const MAX_SECTION_H = 2000

// Normalize a string into a URL slug (matches the backend's norm()).
export function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Soft version for live typing: keeps a trailing hyphen so the user can type
// "a-b" without the hyphen being eaten mid-word.
export function softSlugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
}
