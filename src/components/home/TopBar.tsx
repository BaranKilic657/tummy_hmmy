"use client";

import Link from "next/link";

export function TopBar() {
  return (
    <header className="home-topbar">
      <div className="home-logo">TUMmy</div>

      <nav className="home-nav" aria-label="Main navigation">
        <span>Dashboard</span>
        <span>Widgets</span>
        <span>Campus</span>
      </nav>

      <div className="home-top-actions">
        <div className="home-search-icon">⌕</div>
        <Link href="/login" className="home-avatar" aria-label="Login with TUM ID">
          TUM
        </Link>
      </div>
    </header>
  );
}
