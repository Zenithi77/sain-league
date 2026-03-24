"use client";

import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import Header from "./Header";
import Footer from "./Footer";
import HeroIntro from "./HeroIntro";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isHomePage = pathname === "/";
  const [introComplete, setIntroComplete] = useState(!isHomePage);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className={!introComplete ? "site-intro-active" : undefined}>
      <Header />
      {isHomePage && !introComplete && (
        <HeroIntro onComplete={handleIntroComplete} />
      )}
      <div className="site-content">
        {children}
        <Footer />
      </div>
    </div>
  );
}
