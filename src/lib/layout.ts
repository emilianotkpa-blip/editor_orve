// Design coordinate width. Every element x/y/w/h is relative to a section that
// is STAGE_W wide. The editor renders the stage 1:1; the public page and mobile
// preview scale this same stage to their target width (full-bleed / phone).
export const STAGE_W = 900

export const MIN_SECTION_H = 160
export const MAX_SECTION_H = 2000
