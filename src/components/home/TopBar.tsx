"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TopBarProps = {
  title: string;
};

export function TopBar({ title }: TopBarProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncLoginState = () => {
      const loggedIn = sessionStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(loggedIn);
      localStorage.removeItem("isLoggedIn");
    };

    syncLoginState();
    window.addEventListener("storage", syncLoginState);

    return () => window.removeEventListener("storage", syncLoginState);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("isLoggedIn");
    localStorage.removeItem("isLoggedIn");
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
            {isLoggedIn ? (
              <img src="/picture.png" alt="Profile" className="home-avatar-image" />
            ) : (
              "TUM"
            )}
          </Link>

          {isLoggedIn ? (
            <div className="home-profile-popover" role="menu" aria-label="Profile menu">
              <p className="home-profile-title">TUM Account</p>
              <Link href="/" className="home-profile-item" role="menuitem">
                Dashboard
              </Link>
              <Link href="/chatbot" className="home-profile-item" role="menuitem">
                Assistant
              </Link>
              <Link href="/login" className="home-profile-item" role="menuitem">
                Settings
              </Link>
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
