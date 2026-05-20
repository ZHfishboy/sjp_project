const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'userInfo';

export interface UserInfo {
  userId: number;
  username: string;
  nickname?: string;
  avatarUrl?: string;
  tokenBalance: number;
  totalRecharge: number;
  vipLevel?: number;
  vipExpiresAt?: string;
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveUserInfo(user: UserInfo) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUserInfo(): UserInfo | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
