import { notFound } from 'next/navigation';
import { getPlayerById } from '@/lib/database';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const positionFullName: Record<string, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center',
};

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const player = getPlayerById(params.id);

  if (!player) {
    notFound();
  }

  const teamColor = player.team?.colors?.primary || '#F15F22';

  return (
    <main className="main-content" style={{ padding: 0 }}>
      {/* ===== HERO SECTION (like WNBA) ===== */}
      <div className="pp-hero" style={{ '--team-color': teamColor } as React.CSSProperties}>
        <div className="pp-hero-inner">
          {/* Player Photo */}
          <div className="pp-hero-photo">
            <div className="pp-photo-frame" style={{ borderColor: teamColor }}>
              {player.image ? (
                <img src={player.image} alt={player.name} className="pp-photo-img" />
              ) : (
                <div className="pp-photo-placeholder">
                  <span>{player.name.split(' ').map(w => w[0]).join('').substring(0, 2)}</span>
                </div>
              )}
            </div>
            {player.team && (
              <div className="pp-team-badge">
                <span className="pp-team-badge-text">{player.team.shortName}</span>
              </div>
            )}
          </div>

          {/* Player Name & Info */}
          <div className="pp-hero-info">
            <h1 className="pp-name">{player.name}</h1>
            <p className="pp-team-position">
              {player.team?.name || 'Unknown'} / {positionFullName[player.position] || player.position}
            </p>
          </div>

          {/* Jersey Number */}
          <div className="pp-jersey-number">
            <span className="pp-jersey-hash">#</span>
            <span className="pp-jersey-num">{player.number}</span>
          </div>
        </div>

        {/* Stats Row + Info Grid below hero */}
        <div className="pp-hero-bottom">
          {/* Quick Stats Table */}
          <div className="pp-big-stats">
            <div className="pp-big-stat">
              <span className="pp-big-num">{player.averages.pointsPerGame}</span>
              <span className="pp-big-label">PPG</span>
            </div>
            <div className="pp-big-stat">
              <span className="pp-big-num">{player.averages.reboundsPerGame}</span>
              <span className="pp-big-label">RPG</span>
            </div>
            <div className="pp-big-stat">
              <span className="pp-big-num">{player.averages.assistsPerGame}</span>
              <span className="pp-big-label">APG</span>
            </div>
            <div className="pp-big-stat">
              <span className="pp-big-num">{player.averages.stealsPerGame}</span>
              <span className="pp-big-label">SPG</span>
            </div>
            <div className="pp-big-stat">
              <span className="pp-big-num">{player.averages.blocksPerGame}</span>
              <span className="pp-big-label">BPG</span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="pp-info-grid">
            <div className="pp-info-row">
              <div className="pp-info-cell">
                <span className="pp-info-label">HEIGHT</span>
                <span className="pp-info-value">{player.height || '—'}</span>
              </div>
              <div className="pp-info-cell">
                <span className="pp-info-label">AGE</span>
                <span className="pp-info-value">{player.age || '—'}</span>
              </div>
              <div className="pp-info-cell">
                <span className="pp-info-label">WEIGHT</span>
                <span className="pp-info-value">{player.weight || '—'}</span>
              </div>
            </div>
            <div className="pp-info-row">
              <div className="pp-info-cell">
                <span className="pp-info-label">COUNTRY</span>
                <span className="pp-info-value">{player.country || '—'}</span>
              </div>
              <div className="pp-info-cell">
                <span className="pp-info-label">SCHOOL</span>
                <span className="pp-info-value">{player.team?.school || '—'}</span>
              </div>
              <div className="pp-info-cell">
                <span className="pp-info-label">POSITION</span>
                <span className="pp-info-value">{player.position}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT SECTIONS ===== */}
      <div className="pp-content">
        {/* Shooting Stats */}
        <section className="pp-section">
          <div className="pp-section-header">
            <h2><i className="fas fa-bullseye"></i> Шидэлтийн статистик</h2>
          </div>
          <div className="pp-shooting-grid">
            <div className="pp-shoot-card">
              <div className="pp-shoot-circle">
                <span className="pp-shoot-pct">{player.averages.fieldGoalPercentage}%</span>
              </div>
              <span className="pp-shoot-label">FG%</span>
            </div>
            <div className="pp-shoot-card">
              <div className="pp-shoot-circle">
                <span className="pp-shoot-pct">{player.averages.threePointPercentage}%</span>
              </div>
              <span className="pp-shoot-label">3PT%</span>
            </div>
            <div className="pp-shoot-card">
              <div className="pp-shoot-circle">
                <span className="pp-shoot-pct">{player.averages.freeThrowPercentage}%</span>
              </div>
              <span className="pp-shoot-label">FT%</span>
            </div>
          </div>
        </section>

        {/* Season Stats Table */}
        <section className="pp-section">
          <div className="pp-season-header">
            <h2 className="pp-season-title">
              <span className="pp-season-icon">📊</span>
              STATS
            </h2>
            <div className="pp-season-tabs">
              <button className="pp-season-tab pp-season-tab-active">Season</button>
              <button className="pp-season-tab">Career</button>
            </div>
          </div>

          <div className="pp-season-table-wrap">
            <table className="pp-season-table">
              <thead>
                <tr>
                  <th className="pp-season-col-sticky">SEASON</th>
                  <th>TEAM</th>
                  <th>GP</th>
                  <th>MIN</th>
                  <th>PTS</th>
                  <th>REB</th>
                  <th>AST</th>
                  <th>STL</th>
                  <th>BLK</th>
                  <th>TO</th>
                  <th>PF</th>
                  <th>FG%</th>
                  <th>3PT%</th>
                  <th>FT%</th>
                </tr>
              </thead>
              <tbody>
                {/* Current Season Row */}
                <tr className="pp-season-row pp-season-row-current">
                  <td className="pp-season-col-sticky">
                    <span className="pp-season-year">2026</span>
                    <span className="pp-season-dot"></span>
                  </td>
                  <td>
                    <span className="pp-season-team" style={{ color: teamColor }}>
                      {player.team?.shortName || '—'}
                    </span>
                  </td>
                  <td className="pp-season-stat">{player.stats.gamesPlayed}</td>
                  <td className="pp-season-stat">{player.stats.minutesPlayed}</td>
                  <td className="pp-season-stat pp-stat-highlight">{player.stats.totalPoints}</td>
                  <td className="pp-season-stat">{player.stats.totalRebounds}</td>
                  <td className="pp-season-stat">{player.stats.totalAssists}</td>
                  <td className="pp-season-stat">{player.stats.totalSteals}</td>
                  <td className="pp-season-stat">{player.stats.totalBlocks}</td>
                  <td className="pp-season-stat">{player.stats.totalTurnovers}</td>
                  <td className="pp-season-stat">{player.stats.totalFouls}</td>
                  <td className="pp-season-stat">{player.averages.fieldGoalPercentage}%</td>
                  <td className="pp-season-stat">{player.averages.threePointPercentage}%</td>
                  <td className="pp-season-stat">{player.averages.freeThrowPercentage}%</td>
                </tr>
              </tbody>
              {/* Career Totals Footer */}
              <tfoot>
                <tr className="pp-season-row-career">
                  <td className="pp-season-col-sticky">
                    <span className="pp-career-label">CAREER</span>
                  </td>
                  <td></td>
                  <td className="pp-career-stat">{player.stats.gamesPlayed}</td>
                  <td className="pp-career-stat">{player.stats.minutesPlayed}</td>
                  <td className="pp-career-stat pp-career-highlight">{player.stats.totalPoints}</td>
                  <td className="pp-career-stat">{player.stats.totalRebounds}</td>
                  <td className="pp-career-stat">{player.stats.totalAssists}</td>
                  <td className="pp-career-stat">{player.stats.totalSteals}</td>
                  <td className="pp-career-stat">{player.stats.totalBlocks}</td>
                  <td className="pp-career-stat">{player.stats.totalTurnovers}</td>
                  <td className="pp-career-stat">{player.stats.totalFouls}</td>
                  <td className="pp-career-stat">{player.averages.fieldGoalPercentage}%</td>
                  <td className="pp-career-stat">{player.averages.threePointPercentage}%</td>
                  <td className="pp-career-stat">{player.averages.freeThrowPercentage}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Back link */}
        <div className="pp-back">
          <Link href="/players" className="pp-back-link">
            <i className="fas fa-arrow-left"></i> Бүх тоглогчид
          </Link>
          {player.team && (
            <Link href={`/teams/${player.team.id}`} className="pp-back-link">
              <i className="fas fa-users"></i> {player.team.name}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
