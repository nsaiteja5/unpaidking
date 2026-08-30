import { randomBytes } from "node:crypto";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"; // base32 without confusing characters (0, o, 1, l, i)

export function generatePublicId(length = 10): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}
