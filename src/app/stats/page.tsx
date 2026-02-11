'use client';

import { useState, useEffect } from 'react';
import { PlayerWithAverages } from '@/types';

type CategoryType = 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'fgPercentage' | '3ptPercentage' | 'ftPercentage';

const categories: { key: CategoryType; label: string; statKey: keyof PlayerWithAverages['averages']; suffix: string }[] = [
  { key: 'points', label: 'Оноо', statKey: 'pointsPerGame', suffix: 'PPG' },
  { key: 'rebounds', label: 'Самбар', statKey: 'reboundsPerGame', suffix: 'RPG' },
  { key: 'assists', label: 'Дамжуулалт', statKey: 'assistsPerGame', suffix: 'APG' },
  { key: 'steals', label: 'Хулгай', statKey: 'stealsPerGame', suffix: 'SPG' },
  { key: 'blocks', label: 'Даралт', statKey: 'blocksPerGame', suffix: 'BPG' },
  { key: 'fgPercentage', label: 'FG%', statKey: 'fieldGoalPercentage', suffix: '%' },
  { key: '3ptPercentage', label: '3PT%', statKey: 'threePointPercentage', suffix: '%' },
  { key: 'ftPercentage', label: 'FT%', statKey: 'freeThrowPercentage', suffix: '%' },
];

export default function StatsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('points');
  const [rankings, setRankings] = useState<PlayerWithAverages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rankings/${activeCategory}`);
        const data = await res.json();
        setRankings(data);
      } catch (error) {
        console.error('Error fetching rankings:', error);
      }
      setLoading(false);
    };

    fetchRankings();
  }, [activeCategory]);

  const currentCategory = categories.find((c) => c.key === activeCategory)!;

  return (
    <main className="main-content">
      <div className="page-header">
        <h1><i className="fas fa-chart-bar"></i> Статистик</h1>
        <p>Тоглогчдын эрэмбэ категориор</p>
      </div>

      {/* Category Tabs */}
      <div className="stats-tabs">
        {categories.map((category) => (
          <button
            key={category.key}
            className={`stats-tab ${activeCategory === category.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.key)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Rankings Table */}
      <div className="stats-table-container">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>Уншиж байна...</p>
        ) : (
          <table className="stats-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Тоглогч</th>
                <th>Баг</th>
                <th>Тоглолт</th>
                <th>{currentCategory.suffix}</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((player, index) => (
                <tr
                  key={player.id}
                  onClick={() => (window.location.href = `/players/${player.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="rank">{index + 1}</td>
                  <td>
                    <div className="player-name-cell">
                      <div className="player-avatar-small">{player.name.charAt(0)}</div>
                      <span>{player.name}</span>
                    </div>
                  </td>
                  <td>{player.teamShortName}</td>
                  <td>{player.stats.gamesPlayed}</td>
                  <td className="stat-highlight">{player.averages[currentCategory.statKey]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
