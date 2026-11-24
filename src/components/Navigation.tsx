import type { MouseEvent } from 'react';

interface NavigationProps {
  onHomeClick?: () => void;
}

export function Navigation({ onHomeClick }: NavigationProps) {
  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    if (href === '/') {
      onHomeClick?.();
    }
    if (typeof window !== 'undefined' && window.location.pathname !== href) {
      window.history.pushState(null, '', href);
    }
  };

  return (
    <nav className="nav" aria-label="Main">
      <a href="/broth" onClick={(e) => handleLinkClick(e, '/broth')}>
        BROTH
      </a>
      <a href="/smoked" onClick={(e) => handleLinkClick(e, '/smoked')}>
        SMOKED
      </a>
      <a href="/breads" onClick={(e) => handleLinkClick(e, '/breads')}>
        BREADS
      </a>
      <a
        href="/"
        className="nav-logo"
        aria-label="Frostgate Kitchen home"
        onClick={(e) => handleLinkClick(e, '/')}
      >
        <svg
          viewBox="0 0 48 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M1 21 L15 4 L24 14 L31 7 L47 21" />
          <path d="M10 21 L15 15 L19 21" />
          <path d="M27 21 L31 16 L36 21" />
        </svg>
      </a>
      <a href="/cellar" onClick={(e) => handleLinkClick(e, '/cellar')}>
        CELLAR
      </a>
      <a href="/sauna" onClick={(e) => handleLinkClick(e, '/sauna')}>
        SAUNA
      </a>
      <a href="/team" onClick={(e) => handleLinkClick(e, '/team')}>
        TEAM
      </a>
    </nav>
  );
}
