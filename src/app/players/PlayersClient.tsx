'use client';

import { useState, useMemo } from 'react';
import { PlayerWithAverages } from '@/types';
import Link from 'next/link';

interface PlayersClientProps {
  players: PlayerWithAverages[];
  teams: Array<{ id: string; name: string; shortName: string }>;
}

export default function PlayersClient({ players, teams }: PlayersClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [selectedPosition, setSelectedPosition] = useState('All');

  const positions = useMemo(() => {
    const pos = new Set(players.map(p => p.position));
    return ['All', ...Array.from(pos).sort()];
  }, [players]);

  const groupedPlayers = useMemo(() => {
    let filtered = players;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTeam !== 'All Teams') {
      filtered = filtered.filter(p => p.teamName === selectedTeam);
    }

    if (selectedPosition !== 'All') {
      filtered = filtered.filter(p => p.position === selectedPosition);
    }

    const grouped: { [key: string]: PlayerWithAverages[] } = {};
    filtered.forEach(player => {
      const firstLetter = player.name.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(player);
    });

    return Object.keys(grouped)
      .sort()
      .reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {} as { [key: string]: PlayerWithAverages[] });
  }, [players, searchTerm, selectedTeam, selectedPosition]);

  const teamNames = ['All Teams', ...teams.map(t => t.name).sort()];
  const totalFiltered = Object.values(groupedPlayers).reduce((sum, arr) => sum + arr.length, 0);

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  return (
    <main className="main-content">
      {/* Page Header */}
      <div className="players-page-header">
        <div className="players-page-header-content">
          <span className="players-season-tag">2026 УЛИРАЛ</span>
          <h1 className="players-page-title">
            <i className="fas fa-users"></i> Тоглогчид
          </h1>
          <p className="players-page-subtitle">Sain Girls League-ийн бүх тоглогчид</p>
        </div>
      </div>

      {/* Filters */}
      <div className="players-filters">
        <div className="players-filter-group">
          {/* Search */}
          <div className="players-search-wrapper">
            <i className="fas fa-search players-search-icon"></i>
            <input
              type="text"
              className="players-search-input"
              placeholder="Тоглогч хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Team */}
          <div className="players-select-wrapper">
            <label className="players-filter-label">Баг</label>
            <select
              className="players-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              {teamNames.map(team => (
                <option key={team} value={team}>{team === 'All Teams' ? 'Бүх баг' : team}</option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div className="players-select-wrapper">
            <label className="players-filter-label">Байрлал</label>
            <select
              className="players-select"
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
            >
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos === 'All' ? 'Бүгд' : pos}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="players-count-badge">
          <i className="fas fa-user"></i> {totalFiltered} тоглогч
        </div>
      </div>

      {/* Players List */}
      <div className="players-list-container">
        {Object.keys(groupedPlayers).length === 0 ? (
          <div className="players-empty">
            <i className="fas fa-search"></i>
            <h3>Хайлтын үр дүн олдсонгүй</h3>
            <p>Өөр хайлт хийж үзнэ үү</p>
          </div>
        ) : (
          Object.entries(groupedPlayers).map(([letter, letterPlayers]) => (
            <div key={letter} className="players-letter-group">
              {/* Letter Header */}
              <div className="players-letter-header">
                <span className="players-letter-badge">{letter}</span>
                <div className="players-letter-line"></div>
              </div>

              {/* Players */}
              <div className="players-letter-list">
                {letterPlayers.map((player, idx) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="players-row-link"
                  >
                    <div className={`players-row ${idx < letterPlayers.length - 1 ? 'has-border' : ''}`}>
                      {/* Player Info */}
                      <div className="players-row-info">
                        <div className="players-row-avatar">
                          {player.image ? (
                            <img src={player.image} alt={player.name} />
                          ) : (
                            <span>{getInitials(player.name)}</span>
                          )}
                        </div>
                        <div className="players-row-name-group">
                          <span className="players-row-name">{player.name}</span>
                          <div className="players-row-tags">
                            <span className="players-row-number">#{player.number}</span>
                            <span className="players-row-position">{player.position}</span>
                          </div>
                        </div>
                      </div>

                      {/* Team */}
                      <div className="players-row-cell">
                        <span className="players-row-cell-label">Баг</span>
                        <span className="players-row-cell-value">{player.teamName}</span>
                      </div>

                      {/* Height */}
                      <div className="players-row-cell players-row-cell-sm">
                        <span className="players-row-cell-label">Өндөр</span>
                        <span className="players-row-cell-value">{player.height}</span>
                      </div>

                      {/* College */}
                      <div className="players-row-cell">
                        <span className="players-row-cell-label">Сургууль</span>
                        <span className="players-row-cell-value">{player.college || '—'}</span>
                      </div>

                      {/* Country */}
                      <div className="players-row-cell players-row-cell-sm">
                        <span className="players-row-cell-label">Улс</span>
                        <span className="players-row-cell-value">{player.country || '—'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
