export const AUTH_LOGIN_KEY = "isLoggedIn";
export const AUTH_ACCOUNT_TYPE_KEY = "accountType";

export type AccountType = "guest" | "member";

export function getAccountTypeFromStorage(): AccountType {
  if (typeof window === "undefined") {
    return "member";
  }

  return window.sessionStorage.getItem(AUTH_ACCOUNT_TYPE_KEY) === "guest" ? "guest" : "member";
}

export function isGuestAccount(): boolean {
  return getAccountTypeFromStorage() === "guest";
}
