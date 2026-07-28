/**
 * Capitalize first letter of a string
 */
export const capitalize = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str).charAt(0).toUpperCase() + String(str).slice(1).toLowerCase();
};

/**
 * Convert to title case (capitalize each word)
 */
export const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str)
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Convert snake_case to Title Case
 */
export const snakeCaseToTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format display name (for names, titles, etc.)
 */
export const formatDisplayName = (str: string | null | undefined): string => {
  if (!str) return '-';
  return toTitleCase(str);
};
