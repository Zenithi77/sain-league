"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, userData, logOut, loading } = useAuth();

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { href: "/", label: "Нүүр" },
    { href: "/schedule", label: "Хуваарь" },
    { href: "/standings", label: "Байр" },
    { href: "/stats", label: "Статистик" },
    { href: "/teams", label: "Багууд" },
    { href: "/players", label: "Тоглогчид" },
    { href: "/news", label: "Мэдээ" },
  ];

  async function handleLogout() {
    try {
      await logOut();
      setUserMenuOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  // Show nothing for auth section during SSR to prevent hydration mismatch
  const showAuth = mounted && !loading;

  return (
    <>
      <header className="main-header">
        <div className="header-container">
          <div className="logo">
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="Sain Girls League"
                width={180}
                height={55}
                className="logo-image"
                priority
              />
            </Link>
          </div>
          <nav className="main-nav">
            <ul>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={pathname === link.href ? "active" : ""}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="header-right">
            {showAuth && (
              <>
                {user ? (
                  <div className="user-menu-container">
                    <button
                      className="user-menu-btn"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                    >
                      <div className="user-avatar">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || "User"}
                          />
                        ) : (
                          <span>
                            {(user.displayName ||
                              user.email ||
                              "U")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="user-name">
                        {user.displayName || "Хэрэглэгч"}
                      </span>
                      <i
                        className={`fas fa-chevron-${userMenuOpen ? "up" : "down"}`}
                      ></i>
                    </button>
                    {userMenuOpen && (
                      <div className="user-dropdown">
                        <div className="user-dropdown-header">
                          <span className="user-dropdown-name">
                            {user.displayName || "Хэрэглэгч"}
                          </span>
                          <span className="user-dropdown-email">
                            {user.email}
                          </span>
                        </div>
                        {userData?.role === "admin" && (
                          <Link
                            href="/admin"
                            className="user-dropdown-item"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <i className="fas fa-cog"></i>
                            Админ хэсэг
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="user-dropdown-item logout"
                        >
                          <i className="fas fa-sign-out-alt"></i>
                          Гарах
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="auth-buttons">
                    <Link href="/login" className="auth-link login">
                      Нэвтрэх
                    </Link>
                    <Link href="/signup" className="auth-link signup">
                      Бүртгүүлэх
                    </Link>
                  </div>
                )}
              </>
            )}
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
      <div className={`mobile-menu ${mobileMenuOpen ? "active" : ""}`}>
        <div className="mobile-menu-header">
          <Image
            src="/images/logo.png"
            alt="Sain Girls League"
            width={140}
            height={42}
            className="mobile-logo-image"
          />
          <button
            className="close-menu"
            onClick={() => setMobileMenuOpen(false)}
          >
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
          {showAuth && (
            <div className="mobile-auth">
              {user ? (
                <>
                  <div className="mobile-user-info">
                    <div className="user-avatar">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                        />
                      ) : (
                        <span>
                          {(user.displayName ||
                            user.email ||
                            "U")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="mobile-user-name">
                        {user.displayName || "Хэрэглэгч"}
                      </span>
                      <span className="mobile-user-email">{user.email}</span>
                    </div>
                  </div>
                  {userData?.role === "admin" && (
                    <Link
                      href="/admin"
                      className="mobile-admin-btn"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <i className="fas fa-cog"></i>
                      Админ хэсэг
                    </Link>
                  )}
                  <button onClick={handleLogout} className="mobile-logout-btn">
                    <i className="fas fa-sign-out-alt"></i>
                    Гарах
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="mobile-auth-btn login"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Нэвтрэх
                  </Link>
                  <Link
                    href="/signup"
                    className="mobile-auth-btn signup"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Бүртгүүлэх
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>
      </div>
    </>
  );
}
