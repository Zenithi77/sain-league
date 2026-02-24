import { notFound } from 'next/navigation';
import { getPlayerById } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const player = getPlayerById(params.id);

  if (!player) {
    notFound();
  }

  return (
    <main className="main-content">
      {/* Player Header */}
      <div className="profile-header">
        <div className="profile-image player-avatar-large">
          <span>{player.name.charAt(0)}</span>
        </div>
        <div className="profile-info">
          <h1>{player.name}</h1>
          <div className="profile-meta">
            <div className="profile-meta-item">
              <span className="label">Баг</span>
              <span className="value">{player.team?.name || 'Unknown'}</span>
            </div>
            <div className="profile-meta-item">
              <span className="label">Дугаар</span>
              <span className="value">#{player.number}</span>
            </div>
            <div className="profile-meta-item">
              <span className="label">Байрлал</span>
              <span className="value">{player.position}</span>
            </div>
            <div className="profile-meta-item">
              <span className="label">Өндөр</span>
              <span className="value">{player.height}</span>
            </div>
            <div className="profile-meta-item">
              <span className="label">Жин</span>
              <span className="value">{player.weight}</span>
            </div>
            <div className="profile-meta-item">
              <span className="label">Нас</span>
              <span className="value">{player.age}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Player Stats */}
      <section className="player-stats-section">
        <div className="section-header">
          <h2><i className="fas fa-chart-bar"></i> Дундаж статистик</h2>
        </div>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-value">{player.averages.pointsPerGame}</span>
            <span className="stat-label">PPG</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{player.averages.reboundsPerGame}</span>
            <span className="stat-label">RPG</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{player.averages.assistsPerGame}</span>
            <span className="stat-label">APG</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{player.averages.stealsPerGame}</span>
            <span className="stat-label">SPG</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{player.averages.blocksPerGame}</span>
            <span className="stat-label">BPG</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{player.averages.minutesPerGame}</span>
            <span className="stat-label">MPG</span>
          </div>
        </div>
      </section>

      {/* Shooting Stats */}
      <section className="shooting-stats-section">
        <div className="section-header">
          <h2><i className="fas fa-bullseye"></i> Шидэлтийн статистик</h2>
        </div>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-value">{player.averages.fieldGoalPercentage}%</span>
            <span className="stat-label">FG%</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{player.averages.threePointPercentage}%</span>
            <span className="stat-label">3PT%</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{player.averages.freeThrowPercentage}%</span>
            <span className="stat-label">FT%</span>
          </div>
        </div>
      </section>

      {/* Career Totals */}
      <section className="career-totals-section">
        <div className="section-header">
          <h2><i className="fas fa-calculator"></i> Нийт статистик</h2>
        </div>
        <div className="totals-table-container">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Тоглолт</th>
                <th>Минут</th>
                <th>Оноо</th>
                <th>Самбар</th>
                <th>Дамжуулалт</th>
                <th>Steal</th>
                <th>Block</th>
                <th>Алдаа</th>
                <th>Фол</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{player.stats.gamesPlayed}</td>
                <td>{player.stats.minutesPlayed}</td>
                <td>{player.stats.totalPoints}</td>
                <td>{player.stats.totalRebounds}</td>
                <td>{player.stats.totalAssists}</td>
                <td>{player.stats.totalSteals}</td>
                <td>{player.stats.totalBlocks}</td>
                <td>{player.stats.totalTurnovers}</td>
                <td>{player.stats.totalFouls}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
