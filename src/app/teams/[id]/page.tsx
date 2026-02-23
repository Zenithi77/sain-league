import { notFound } from 'next/navigation';
import PlayerCard from '@/components/PlayerCard';
import { getTeamById } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
  const team = getTeamById(params.id);

  if (!team) {
    notFound();
  }

  return (
    <main className="main-content">
      {/* Team Header */}
      <div className="profile-header" id="teamHeader">
        <div
          className="profile-image"
          style={{
            background: `linear-gradient(135deg, ${team.colors?.primary || '#333'} 0%, ${team.colors?.secondary || '#666'} 100%)`,
          }}
        >
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '60px', fontWeight: 700 }}>
            {team.shortName}
          </span>
        </div>
        <div className="profile-info">
          <h1>{team.name}</h1>
          <div className="profile-meta">
            <div className="profile-meta-item">
              <span className="label">Сургууль</span>
              <span className="value">{team.school}</span>
            </div>
            <div className="profile-meta-item">
              <span className="label">Хот</span>
              <span className="value">{team.city}</span>
            </div>
            <div className="profile-meta-item">
              <span className="label">Бүс</span>
              <span className="value">{team.conference === 'east' ? 'East' : team.conference === 'west' ? 'West' : 'N/A'}</span>
            </div>
            <div className="profile-meta-item">
              <span className="label">Дасгалжуулагч</span>
              <span className="value">{team.coach?.name || 'N/A'}</span>
            </div>
            <div className="profile-meta-item">
              <span className="label">Хожил-Хожигдол</span>
              <span className="value">
                {team.stats.wins} - {team.stats.losses}
              </span>
            </div>
          </div>
          <div className="profile-stats-grid">
            <div className="profile-stat">
              <span className="value">{team.averages?.pointsPerGame || 0}</span>
              <span className="label">PPG</span>
            </div>
            <div className="profile-stat">
              <span className="value">{team.averages?.reboundsPerGame || 0}</span>
              <span className="label">RPG</span>
            </div>
            <div className="profile-stat">
              <span className="value">{team.averages?.assistsPerGame || 0}</span>
              <span className="label">APG</span>
            </div>
            <div className="profile-stat">
              <span className="value">{team.averages?.stealsPerGame || 0}</span>
              <span className="label">SPG</span>
            </div>
            <div className="profile-stat">
              <span className="value">{team.averages?.blocksPerGame || 0}</span>
              <span className="label">BPG</span>
            </div>
            <div className="profile-stat">
              <span className="value">{team.winPercentage}%</span>
              <span className="label">WIN%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Roster */}
      <section className="team-roster">
        <div className="section-header">
          <h2><i className="fas fa-users"></i> Тоглогчид</h2>
        </div>
        <div className="players-grid">
          {team.players.map((player) => (
            <PlayerCard key={player.id} player={player} teamName={team.name} />
          ))}
        </div>
      </section>
    </main>
  );
}
