import Link from 'next/link';

export default function SeasonBanner() {
  return (
    <div className="season-banner">
      <div className="banner-content">
        <span className="banner-logo">🏀 SAIN</span>
        <span className="banner-text">2026 УЛИРАЛ ЭХЭЛЛЭЭ</span>
        <Link href="/schedule" className="banner-btn">
          ХУВААРЬ ХАРАХ
        </Link>
      </div>
    </div>
  );
}
