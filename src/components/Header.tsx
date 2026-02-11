'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Нүүр' },
    { href: '/schedule', label: 'Хуваарь' },
    { href: '/standings', label: 'Байр' },
    { href: '/stats', label: 'Статистик' },
    { href: '/teams', label: 'Багууд' },
    { href: '/players', label: 'Тоглогчид' },
    { href: '/admin', label: 'Админ' },
  ];

  return (
    <>
      <header className="main-header">
        <div className="header-container">
          <div className="logo">
            <Link href="/">
              <span className="logo-icon">🏀</span>
              <span className="logo-text">SAIN</span>
              <span className="logo-subtext">GIRLS LEAGUE</span>
            </Link>
          </div>
          <nav className="main-nav">
            <ul>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={pathname === link.href ? 'active' : ''}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="header-right">
            <button
              className="menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
            >
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-header">
          <span className="mobile-logo">🏀 SAIN</span>
          <button className="close-menu" onClick={() => setMobileMenuOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <nav className="mobile-nav">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
