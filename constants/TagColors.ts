/**
 * Centralised tag colour map — used on EventCard pills and the event detail hero.
 * Each entry has a background color and a text color so light backgrounds can
 * use dark text and vice-versa.
 */
export interface TagStyle {
  bg: string;
  text: string;
}

export const TAG_STYLES: Record<string, TagStyle> = {
  Virtual:  { bg: '#3B82F6', text: '#fff'   },
  Hybrid:   { bg: '#F59E0B', text: '#fff'   },
  Onsite:   { bg: '#22C55E', text: '#fff'   },
  Games:    { bg: '#EF4444', text: '#fff'   },
  VibeTag:  { bg: '#8B5CF6', text: '#fff'   },
  Free:     { bg: '#22C55E', text: '#fff'   },
  Online:   { bg: '#3B82F6', text: '#fff'   },
};

const FALLBACK: TagStyle = { bg: '#9E849D', text: '#fff' };

export function getTagStyle(name: string): TagStyle {
  return TAG_STYLES[name] ?? FALLBACK;
}

/** Convenience — just the background color (used where text color isn't needed) */
export function tagColor(name: string): string {
  return getTagStyle(name).bg;
}

/** Convenience — just the text color */
export function tagTextColor(name: string): string {
  return getTagStyle(name).text;
}

/** @deprecated use TAG_STYLES instead */
export const TAG_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(TAG_STYLES).map(([k, v]) => [k, v.bg])
);
