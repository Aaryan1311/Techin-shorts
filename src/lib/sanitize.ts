import DOMPurify from "isomorphic-dompurify";

/** Sanitize user input string — strips HTML/XSS */
export function sanitize(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim();
}

/** Sanitize and limit length */
export function sanitizeWithLimit(input: string, maxLength: number): string {
  return sanitize(input).slice(0, maxLength);
}
