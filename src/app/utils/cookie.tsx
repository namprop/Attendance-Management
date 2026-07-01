import { setCookie, getCookie, deleteCookie } from "cookies-next";

interface OptionsType {
  path?: string;
  expires?: Date;
  maxAge?: number;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
}

// Generic base
export const cookieBase = {

  set<T>(key: string, value: T, options?: OptionsType): void {
    setCookie(key, JSON.stringify(value), { path: "/", ...options });
  },

  get<T>(key: string): T | null {
    const cookie = getCookie(key);
    if (!cookie) return null;
    try {
      return JSON.parse(cookie as string) as T;
    } catch {
      return null;
    }
  },

  remove(key: string): void {
    deleteCookie(key, { path: "/" });
  },
};
