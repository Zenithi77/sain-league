import Link from 'next/link';
import SeasonBanner from '@/components/SeasonBanner';
import StandingsTable from '@/components/StandingsTable';
import TopPlayersList from '@/components/TopPlayersList';
import GameCard from '@/components/GameCard';
import { TeamWithAverages, PlayerWithAverages, GameWithTeams } from '@/types';

async function getStandings(): Promise<TeamWithAverages[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/standings`, {
    cache: 'no-store',
  });
  return res.json();
}

async function getPlayers(): Promise<PlayerWithAverages[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/players`, {
    cache: 'no-store',
  });
  return res.json();
}

async function getGames(): Promise<GameWithTeams[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/games`, {
    cache: 'no-store',
  });
  return res.json();
}

async function getRankings(category: string): Promise<PlayerWithAverages[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/rankings/${category}`,
    { cache: 'no-store' }
  );
  return res.json();
}

export default async function HomePage() {
  const [standings, players, games, topScorers, topRebounders, topAssisters] = await Promise.all([
    getStandings(),
    getPlayers(),
    getGames(),
    getRankings('points'),
    getRankings('rebounds'),
    getRankings('assists'),
  ]);

  const upcomingGames = games.filter((g) => g.status === 'scheduled').slice(0, 6);

  return (
    <>
      <SeasonBanner />
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-left">
              <span className="featured-tag">ОНЦЛОХ</span>
              <h1 className="hero-title">Sain Girls League 2026</h1>
              <p className="hero-description">
                Монголын охидын сагсан бөмбөгийн лигт тавтай морилно уу. 16 баг, шилдэг тоглогчид,
                хурц тоглолтууд таныг хүлээж байна.
              </p>
              <Link href="/teams" className="hero-btn">
                Бүх багуудыг харах <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
            <div className="hero-right">
              <div className="hero-image">
                <div className="hero-placeholder">
                  <i className="fas fa-basketball-ball"></i>
                  <span>SAIN LEAGUE</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats Cards */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-info">
              <span className="stat-number">{standings.length}</span>
              <span className="stat-label">Багууд</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-user"></i>
            </div>
            <div className="stat-info">
              <span className="stat-number">{players.length}</span>
              <span className="stat-label">Тоглогчид</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-calendar"></i>
            </div>
            <div className="stat-info">
              <span className="stat-number">{games.length}</span>
              <span className="stat-label">Тоглолтууд</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-trophy"></i>
            </div>
            <div className="stat-info">
              <span className="stat-number">2026</span>
              <span className="stat-label">Улирал</span>
            </div>
          </div>
        </section>

        {/* News Cards Section */}
        <section className="news-section">
          <div className="news-grid">
            <div className="news-card featured">
              <div className="news-image">
                <div className="news-placeholder">
                  <i className="fas fa-trophy"></i>
                </div>
              </div>
              <div className="news-content">
                <span className="news-tag">МЭДЭЭ</span>
                <h3>2026 Улирал Нээлтээ Хийлээ</h3>
                <p>
                  Sain Girls League-ийн 2026 оны улирал албан ёсоор нээлтээ хийлээ. 16 баг шинэ
                  улирлыг угтаж байна.
                </p>
              </div>
            </div>
            <div className="side-news">
              <div className="side-news-card">
                <h4>Тоглолтын Хуваарь Гарлаа</h4>
                <p>2026 улирлын бүх тоглолтын хуваарийг одоо харах боломжтой</p>
                <Link href="/schedule">
                  Дэлгэрэнгүй <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
              <div className="side-news-card">
                <h4>Шинэ Багууд</h4>
                <p>Энэ улиралд нэмэгдсэн шинэ багуудтай танилц</p>
                <Link href="/teams">
                  Дэлгэрэнгүй <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
              <div className="side-news-card">
                <h4>Топ Тоглогчид</h4>
                <p>Хамгийн өндөр үзүүлэлттэй тоглогчид</p>
                <Link href="/stats">
                  Дэлгэрэнгүй <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Standings Preview */}
        <section className="standings-preview">
          <div className="section-header">
            <h2>
              <i className="fas fa-medal"></i> Байр дараалал
            </h2>
            <Link href="/standings" className="view-all">
              Бүгдийг харах <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <StandingsTable standings={standings} limit={8} />
        </section>

        {/* Top Players Section */}
        <section className="top-players">
          <div className="section-header">
            <h2>
              <i className="fas fa-star"></i> Топ Тоглогчид
            </h2>
            <Link href="/stats" className="view-all">
              Бүгдийг харах <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <div className="players-categories">
            <div className="category-card">
              <h3>
                <i className="fas fa-basketball-ball"></i> Оноо
              </h3>
              <TopPlayersList players={topScorers} statKey="pointsPerGame" statLabel="PTS" />
            </div>
            <div className="category-card">
              <h3>
                <i className="fas fa-hand-rock"></i> Самбар
              </h3>
              <TopPlayersList players={topRebounders} statKey="reboundsPerGame" statLabel="REB" />
            </div>
            <div className="category-card">
              <h3>
                <i className="fas fa-hands-helping"></i> Дамжуулалт
              </h3>
              <TopPlayersList players={topAssisters} statKey="assistsPerGame" statLabel="AST" />
            </div>
          </div>
        </section>

        {/* Upcoming Games */}
        <section className="upcoming-games">
          <div className="section-header">
            <h2>
              <i className="fas fa-calendar-alt"></i> Удахгүй болох тоглолтууд
            </h2>
            <Link href="/schedule" className="view-all">
              Бүх хуваарь <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <div className="games-grid">
            {upcomingGames.length > 0 ? (
              upcomingGames.map((game) => <GameCard key={game.id} game={game} />)
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                Удахгүй болох тоглолт байхгүй байна
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
