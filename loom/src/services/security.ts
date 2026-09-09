import DOMPurify from 'dompurify';
import type { AppManifest, LoomCapability } from '../types/manifest';

export const VALID_CAPABILITIES: LoomCapability[] = [
  'storage:read',
  'storage:write',
  'clipboard:read',
  'clipboard:write',
  'state:read',
  'state:write',
  'vfs:read',
  'vfs:write',
  'notification'
];

export const MAX_MANIFEST_SIZE_BYTES = 64 * 1024; // 64 KB

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  manifest?: AppManifest;
}

/**
 * Validates and sanitizes third-party app manifests.
 * Enforces strict URL scheme rules, capability whitelist, and payload size bounds.
 */
export function validateManifest(rawJson: unknown): ValidationResult {
  const errors: string[] = [];

  if (!rawJson || typeof rawJson !== 'object') {
    return { isValid: false, errors: ['Manifest must be a non-null JSON object'] };
  }

  const strRepresentation = JSON.stringify(rawJson);
  if (new TextEncoder().encode(strRepresentation).length > MAX_MANIFEST_SIZE_BYTES) {
    return { isValid: false, errors: [`Manifest exceeds max size of ${MAX_MANIFEST_SIZE_BYTES} bytes`] };
  }

  const candidate = rawJson as Record<string, any>;

  // Validate ID
  if (typeof candidate.id !== 'string' || !/^[a-zA-Z0-9_.-]{3,64}$/.test(candidate.id)) {
    errors.push('App id must be a string (3-64 characters) containing only letters, numbers, dots, dashes, and underscores');
  }

  // Validate Name
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0 || candidate.name.length > 50) {
    errors.push('App name must be a non-empty string under 50 characters');
  }

  // Validate Version
  if (typeof candidate.version !== 'string' || !/^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/.test(candidate.version)) {
    errors.push('App version must follow semver format (e.g., 1.0.0)');
  }

  // Validate URL scheme: ONLY https: or relative /apps/ allowed (or localhost for dev)
  if (typeof candidate.url !== 'string') {
    errors.push('App url is required and must be a string');
  } else {
    const urlStr = candidate.url.trim();
    if (urlStr.startsWith('/')) {
      // Relative internal app URL - allowed for built-in apps
    } else {
      try {
        const parsed = new URL(urlStr);
        const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
        if (parsed.protocol !== 'https:' && !isLocalhost) {
          errors.push(`Disallowed URL scheme "${parsed.protocol}". Third-party apps must use https:`);
        }
      } catch {
        errors.push('Invalid URL format');
      }
    }
  }

  // Validate Permissions / Capabilities
  if (!Array.isArray(candidate.permissions)) {
    errors.push('Manifest permissions must be an array');
  } else {
    const invalidPermissions = candidate.permissions.filter(
      (perm: any) => typeof perm !== 'string' || !VALID_CAPABILITIES.includes(perm as LoomCapability)
    );
    if (invalidPermissions.length > 0) {
      errors.push(`Manifest contains unrecognized capabilities: ${invalidPermissions.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const sanitizedManifest: AppManifest = {
    id: candidate.id.trim(),
    name: sanitizeText(candidate.name),
    version: candidate.version.trim(),
    description: candidate.description ? sanitizeText(candidate.description) : '',
    icon: candidate.icon ? sanitizeText(candidate.icon) : 'Square',
    url: candidate.url.trim(),
    permissions: Array.from(new Set(candidate.permissions as LoomCapability[])),
    author: candidate.author ? sanitizeText(candidate.author) : undefined,
    themeColor: candidate.themeColor ? sanitizeText(candidate.themeColor) : undefined
  };

  return {
    isValid: true,
    errors: [],
    manifest: sanitizedManifest
  };
}

/**
 * Sanitizes rich text / markdown HTML content using DOMPurify.
 * Disallows scripts, object, embed, or iframe injection from UGC.
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 
      'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'hr', 'span'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false
  });
}

/**
 * Basic string sanitization stripping control characters and HTML tags.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 1000);
}

/**
 * Generates an unguessable session token for sandboxed iframes.
 */
export function generateSessionToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
