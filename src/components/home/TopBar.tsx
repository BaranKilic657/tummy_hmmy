"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AUTH_ACCOUNT_TYPE_KEY, AUTH_LOGIN_KEY, type AccountType } from "@/lib/auth-session";

type TopBarProps = {
  title: string;
  accountType?: AccountType;
};

export function TopBar({ title, accountType = "member" }: TopBarProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncLoginState = () => {
      const loggedIn = sessionStorage.getItem(AUTH_LOGIN_KEY) === "true";
      setIsLoggedIn(loggedIn);
      localStorage.removeItem(AUTH_LOGIN_KEY);
    };

    syncLoginState();
    window.addEventListener("storage", syncLoginState);

    return () => window.removeEventListener("storage", syncLoginState);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_LOGIN_KEY);
    sessionStorage.removeItem(AUTH_ACCOUNT_TYPE_KEY);
    localStorage.removeItem(AUTH_LOGIN_KEY);
    setIsLoggedIn(false);
    window.dispatchEvent(new Event("auth-state-changed"));
    router.push("/");
  };
  return (
    <header className="home-topbar">
      <div className="home-logo">TUMmy</div>

      <nav className="home-nav" aria-label="Main navigation">
        <span>{title}</span>
      </nav>

      <div className="home-top-actions">
        <div className="home-search-icon">⌕</div>
        <div className="home-profile-menu">
          <Link
            href={isLoggedIn ? "/" : "/login"}
            className={`home-avatar ${isLoggedIn ? "home-avatar-large" : ""}`}
            aria-label={isLoggedIn ? "Open profile" : "Login with TUM ID"}
          >
            {isLoggedIn && accountType !== "guest" ? (
              <img src="/picture.png" alt="Profile" className="home-avatar-image" />
            ) : isLoggedIn && accountType === "guest" ? (
              "GST"
            ) : (
              "TUM"
            )}
          </Link>

          {isLoggedIn ? (
            <div className="home-profile-popover" role="menu" aria-label="Profile menu">
              <p className="home-profile-title">{accountType === "guest" ? "Guest Account" : "TUM Account"}</p>
              <Link href="/" className="home-profile-item" role="menuitem">
                Dashboard
              </Link>
              <Link href="/chatbot" className="home-profile-item" role="menuitem">
                Assistant
              </Link>
              {accountType !== "guest" ? (
                <Link href="/login" className="home-profile-item" role="menuitem">
                  Settings
                </Link>
              ) : null}
              <button
                type="button"
                className="home-profile-item home-profile-item-danger"
                role="menuitem"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
