export const AUTH_CONSTANTS = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_HASH_ROUNDS: 12,

  MAX_FAILED_LOGIN_COUNT: 5,
  ACCOUNT_LOCK_MINUTES: 30,

  SESSION_COOKIE_NAME: "etken_wms_session",
  WEB_SESSION_DURATION_SECONDS: 60 * 60 * 24,
  RF_SESSION_DURATION_SECONDS: 60 * 60 * 24 * 7,
} as const;

export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Kullanıcı adı veya şifre hatalı.",
  USER_NOT_FOUND: "Kullanıcı bulunamadı.",
  USER_PASSIVE: "Kullanıcı hesabı pasif durumdadır.",
  USER_LOCKED: "Kullanıcı hesabı kilitlenmiştir.",
  USER_SUSPENDED: "Kullanıcı hesabı askıya alınmıştır.",
  USER_DELETED: "Kullanıcı hesabı kullanılamıyor.",
  PASSWORD_REQUIRED: "Şifre zorunludur.",
  PASSWORD_TOO_SHORT: "Şifre en az 8 karakter olmalıdır.",
  SESSION_NOT_FOUND: "Geçerli oturum bulunamadı.",
  UNAUTHORIZED: "Bu işlem için oturum açmanız gerekiyor.",
  FORBIDDEN: "Bu işlem için yetkiniz bulunmuyor.",
} as const;