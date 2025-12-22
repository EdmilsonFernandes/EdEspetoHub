export type SocialLink = { type: string; value: string };

const normalizeEntry = (entry: any): SocialLink | null => {
  if (!entry) return null;
  const type = typeof entry.type === 'string' ? entry.type.trim() : '';
  const value = typeof entry.value === 'string' ? entry.value.trim() : '';
  if (!type || !value) return null;
  return { type, value };
};

export const sanitizeSocialLinks = (links: unknown): SocialLink[] => {
  if (!Array.isArray(links)) return [];

  const cleaned = links
    .map(normalizeEntry)
    .filter((link): link is SocialLink => !!link);

  return cleaned;
};
