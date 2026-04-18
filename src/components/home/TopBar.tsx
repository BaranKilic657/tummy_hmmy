"use client";

export function TopBar() {
  return (
    <header className="home-topbar">
      <div className="home-logo">TUMmy</div>

      <nav className="home-nav" aria-label="Main navigation">
        <span>Dashboard</span>
        <span>Widgets</span>
        <span>Campus</span>
      </nav>

      <div className="home-top-actions" aria-hidden="true">
        <div className="home-search-icon">⌕</div>
        <div className="home-avatar">TUM</div>
      </div>
    </header>
  );
}
