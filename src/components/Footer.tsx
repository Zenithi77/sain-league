import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="footer-logo">🏀 SAIN GIRLS LEAGUE</span>
          <p>Монголын Охидын Сагсан Бөмбөгийн Лиг</p>
        </div>
        <div className="footer-links">
          <div className="footer-section">
            <h4>Цэс</h4>
            <ul>
              <li><Link href="/">Нүүр</Link></li>
              <li><Link href="/schedule">Хуваарь</Link></li>
              <li><Link href="/standings">Байр</Link></li>
              <li><Link href="/stats">Статистик</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Багууд</h4>
            <ul>
              <li><Link href="/teams">Бүх багууд</Link></li>
              <li><Link href="/players">Тоглогчид</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Холбоо барих</h4>
            <ul>
              <li><i className="fas fa-envelope"></i> info@sainleague.mn</li>
              <li><i className="fas fa-phone"></i> +976 99001234</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 Sain Girls League. Бүх эрх хуулиар хамгаалагдсан.</p>
      </div>
    </footer>
  );
}
