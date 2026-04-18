"use client";

import Link from "next/link";

type TopBarProps = {
  title: string;
};

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="home-topbar">
      <div className="home-logo">TUMmy</div>

      <nav className="home-nav" aria-label="Main navigation">
        <span>{title}</span>
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
