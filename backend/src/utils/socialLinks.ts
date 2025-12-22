export interface SocialLink
{
  type: string;
  value: string;
}

export function sanitizeSocialLinks(input: unknown): SocialLink[]
{
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      (l): l is SocialLink =>
        typeof l === 'object' &&
        l !== null &&
        typeof (l as any).type === 'string' &&
        typeof (l as any).value === 'string' &&
        (l as any).value.trim() !== '',
    );
}
