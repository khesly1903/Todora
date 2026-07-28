const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;
const MIN_PASSWORD_LENGTH = 8;
const HAS_DIGIT = /[0-9]/;
const HAS_SPECIAL_CHAR = /[^a-zA-Z0-9]/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

/** At least 8 characters, one digit, and one special (non-alphanumeric) character. */
export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && HAS_DIGIT.test(password) && HAS_SPECIAL_CHAR.test(password);
}
