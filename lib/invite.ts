// Invite-Codes für Ligen.
// 6 Stellen, Großbuchstaben + Zahlen, ohne 0/O/1/I/L (Verwechslungs-Gift).
// 30^6 ≈ 729 Mio Codes — für MVP-Scope genug, Unique-Constraint in DB fängt Kollisionen.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateInviteCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}
