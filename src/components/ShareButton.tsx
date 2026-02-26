"use client";

import { useState } from "react";

interface ShareButtonProps {
  title: string;
}

export default function ShareButton({ title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  return (
    <div className="news-share-buttons">
      <button
        onClick={handleShare}
        className="news-share-btn"
        title="Хуваалцах"
      >
        {copied ? (
          <>
            <i className="fas fa-check"></i> Хуулсан
          </>
        ) : (
          <>
            <i className="fas fa-share-alt"></i> Хуваалцах
          </>
        )}
      </button>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="news-share-btn facebook"
        title="Facebook"
      >
        <i className="fab fa-facebook-f"></i>
      </a>

      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="news-share-btn twitter"
        title="Twitter"
      >
        <i className="fab fa-twitter"></i>
      </a>
    </div>
  );
}
