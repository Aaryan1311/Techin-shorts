/** Sanitize user input string — strips HTML/XSS with zero dependencies */
export function sanitize(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;]+;/g, "")
    .replace(/[<>"'`]/g, "")
    .trim()
    .slice(0, 10000);
}

/** Sanitize and limit length */
export function sanitizeWithLimit(input: string, maxLength: number): string {
  return sanitize(input).slice(0, maxLength);
}

/** Sanitize email */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim().slice(0, 255);
}

/** Sanitize search query */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== "string") return "";
  return query
    .replace(/<[^>]*>/g, "")
    .replace(/[%_\\<>"'`]/g, "")
    .trim()
    .slice(0, 200);
}
