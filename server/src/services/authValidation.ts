const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;
const MIN_PASSWORD_LENGTH = 8;
const HAS_DIGIT = /[0-9]/;
const HAS_SPECIAL_CHAR = /[^a-zA-Z0-9]/;
// Unicode letters/marks (covers Turkish ü, ğ, ş, ı, ö, ç and other scripts), spaces, and common name punctuation.
const NAME_PATTERN = /^[\p{L}\p{M} .'-]{1,50}$/u;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

/** At least 8 characters, one digit, and one special (non-alphanumeric) character. */
export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && HAS_DIGIT.test(password) && HAS_SPECIAL_CHAR.test(password);
}

/** 1-50 characters, any Unicode letters/marks plus spaces, hyphens, apostrophes, and periods. */
export function isValidName(name: string): boolean {
  return NAME_PATTERN.test(name) && name.trim().length > 0;
}
