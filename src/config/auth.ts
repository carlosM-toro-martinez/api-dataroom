export function getJwtSecret() {
  return process.env.JWT_SECRET || "default_secret";
}

export function getRefreshTokenSecret() {
  return process.env.REFRESH_TOKEN_SECRET || "refresh_secret";
}
