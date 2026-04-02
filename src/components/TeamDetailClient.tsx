"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import PlayerCard from "@/components/PlayerCard";
import { TeamWithAverages, PlayerWithAverages, GameWithTeams } from "@/types";

const MN_WEEKDAYS = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];
const MN_MONTHS = ["1-р сар","2-р сар","3-р сар","4-р сар","5-р сар","6-р сар","7-р сар","8-р сар","9-р сар","10-р сар","11-р сар","12-р сар"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${MN_WEEKDAYS[d.getDay()]}, ${MN_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface TeamDetailClientProps {
  team: TeamWithAverages & { players: PlayerWithAverages[] };
  upcoming: GameWithTeams[];
  recent: GameWithTeams[];
}

type TabId = "overview" | "roster" | "schedule" | "stats";

export default function TeamDetailClient({ team, upcoming, recent }: TeamDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const tickerRef = useRef<HTMLDivElement>(null);

  const allGames = [...upcoming, ...recent].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "overview", label: "Ерөнхий", icon: "fas fa-home" },
    { id: "roster", label: "Тоглогчид", icon: "fas fa-users" },
    { id: "schedule", label: "Хуваарь", icon: "fas fa-calendar-alt" },
    { id: "stats", label: "Статистик", icon: "fas fa-chart-bar" },
  ];

  const scrollTicker = (dir: "left" | "right") => {
    if (tickerRef.current) {
      const amount = 320;
      tickerRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  return (
    <div className="td" style={{ "--td-primary": team.colors?.primary || "#1a365d", "--td-secondary": team.colors?.secondary || "#2d4a7a" } as React.CSSProperties}>
      {/* === TEAM SUBNAV === */}
      <div className="td-subnav">
        <div className="td-subnav-inner">
          <div className="td-subnav-identity">
            <div className="td-subnav-logo" style={{ background: `linear-gradient(135deg, ${team.colors?.primary || "#333"} 0%, ${team.colors?.secondary || "#666"} 100%)` }}>
              <span>{team.shortName}</span>
            </div>
            <div className="td-subnav-team">
              <span className="td-subnav-name">{team.name}</span>
              <span className="td-subnav-record">{team.stats.wins}-{team.stats.losses}</span>
            </div>
          </div>
          <nav className="td-subnav-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`td-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
            <Link href="/teams" className="td-tab-btn td-tab-back">
              <i className="fas fa-th-large"></i>
              <span>Бүх багууд</span>
            </Link>
          </nav>
        </div>
        <div className="td-subnav-accent" style={{ background: `linear-gradient(90deg, ${team.colors?.primary} 0%, ${team.colors?.secondary} 100%)` }} />
      </div>

      {/* === GAME TICKER CAROUSEL (always visible) === */}
      {allGames.length > 0 && (
        <div className="td-ticker-section">
          <button className="td-ticker-arrow td-ticker-left" onClick={() => scrollTicker("left")}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="td-ticker-track" ref={tickerRef}>
            {allGames.map((game) => {
              const isHome = game.homeTeamId === team.id;
              const opponent = isHome ? game.awayTeam : game.homeTeam;
              const myScore = isHome ? game.homeScore : game.awayScore;
              const oppScore = isHome ? game.awayScore : game.homeScore;
              const won = game.status === "finished" && myScore > oppScore;
              const lost = game.status === "finished" && myScore < oppScore;

              return (
                <Link href={`/game/${game.id}`} key={game.id} className={`td-ticker-card ${game.status}`}>
                  <div className="td-ticker-date">{formatDate(game.date)}</div>
                  <div className="td-ticker-matchup">
                    <div className="td-ticker-team">
                      <div className="td-ticker-logo" style={{ background: `linear-gradient(135deg, ${team.colors?.primary} 0%, ${team.colors?.secondary} 100%)` }}>
                        {team.shortName?.charAt(0)}
                      </div>
                      <span className="td-ticker-short">{team.shortName}</span>
                    </div>
                    <span className="td-ticker-vs">{isHome ? "vs." : "@"}</span>
                    <div className="td-ticker-team">
                      <div className="td-ticker-logo" style={{ background: `linear-gradient(135deg, ${opponent?.colors?.primary || "#444"} 0%, ${opponent?.colors?.secondary || "#666"} 100%)` }}>
                        {opponent?.shortName?.charAt(0) || "?"}
                      </div>
                      <span className="td-ticker-short">{opponent?.shortName || "TBD"}</span>
                    </div>
                  </div>
                  <div className="td-ticker-info">
                    {game.status === "finished" ? (
                      <>
                        <span className="td-ticker-record-line">{team.stats.wins}-{team.stats.losses}</span>
                        <span className={`td-ticker-score ${won ? "win" : "loss"}`}>
                          {myScore}-{oppScore}
                        </span>
                      </>
                    ) : game.status === "live" ? (
                      <span className="td-ticker-live"><span className="live-dot"></span> LIVE</span>
                    ) : (
                      <span className="td-ticker-scheduled">Товлосон</span>
                    )}
                  </div>
                  {game.status === "finished" && (
                    <div className="td-ticker-actions">
                      <span className="td-ticker-action-btn">
                        <i className="fas fa-chart-line"></i> Дэлгэрэнгүй
                      </span>
                    </div>
                  )}
                  {game.status === "scheduled" && (
                    <div className="td-ticker-actions">
                      <span className="td-ticker-action-btn">
                        <i className="fas fa-info-circle"></i> Мэдээлэл
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          <button className="td-ticker-arrow td-ticker-right" onClick={() => scrollTicker("right")}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}

      {/* === TAB CONTENT === */}
      <div className="td-content">
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <div className="td-tab-content">
            {/* Team Hero Banner */}
            <div className="td-hero">
              <div className="td-hero-bg" style={{ background: `linear-gradient(135deg, ${team.colors?.primary}22 0%, ${team.colors?.secondary}22 50%, transparent 100%)` }} />
              <div className="td-hero-logo" style={{ background: `linear-gradient(135deg, ${team.colors?.primary} 0%, ${team.colors?.secondary} 100%)` }}>
                <span>{team.shortName}</span>
              </div>
              <div className="td-hero-info">
                <h1 className="td-hero-name">{team.name}</h1>
                <div className="td-hero-meta">
                  <span><i className="fas fa-school"></i> {team.school}</span>
                  <span><i className="fas fa-map-marker-alt"></i> {team.city}</span>
                  <span><i className="fas fa-globe-asia"></i> {team.conference === "east" ? "East" : team.conference === "west" ? "West" : "N/A"}</span>
                  <span><i className="fas fa-user-tie"></i> {team.coach?.name || "N/A"}</span>
                </div>
                <div className="td-hero-record">
                  <div className="td-hero-wl">
                    <span className="td-hero-wl-num">{team.stats.wins}</span>
                    <span className="td-hero-wl-label">Хожил</span>
                  </div>
                  <div className="td-hero-wl-divider" />
                  <div className="td-hero-wl">
                    <span className="td-hero-wl-num">{team.stats.losses}</span>
                    <span className="td-hero-wl-label">Хожигдол</span>
                  </div>
                  <div className="td-hero-wl-divider" />
                  <div className="td-hero-wl">
                    <span className="td-hero-wl-num">{team.winPercentage}%</span>
                    <span className="td-hero-wl-label">Хожлын %</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="td-quick-stats">
              <div className="td-qstat"><span className="td-qstat-val">{team.averages?.pointsPerGame || 0}</span><span className="td-qstat-lbl">PPG</span></div>
              <div className="td-qstat"><span className="td-qstat-val">{team.averages?.reboundsPerGame || 0}</span><span className="td-qstat-lbl">RPG</span></div>
              <div className="td-qstat"><span className="td-qstat-val">{team.averages?.assistsPerGame || 0}</span><span className="td-qstat-lbl">APG</span></div>
              <div className="td-qstat"><span className="td-qstat-val">{team.averages?.stealsPerGame || 0}</span><span className="td-qstat-lbl">SPG</span></div>
              <div className="td-qstat"><span className="td-qstat-val">{team.averages?.blocksPerGame || 0}</span><span className="td-qstat-lbl">BPG</span></div>
              <div className="td-qstat"><span className="td-qstat-val">{team.averages?.pointsAllowedPerGame || 0}</span><span className="td-qstat-lbl">OPPG</span></div>
            </div>

            {/* Recent Results + Upcoming side by side */}
            <div className="td-overview-games">
              <div className="td-og-panel">
                <div className="td-og-header">
                  <h3>Сүүлийн үр дүн</h3>
                  <button className="td-og-more" onClick={() => setActiveTab("schedule")}>Бүгд →</button>
                </div>
                {recent.length > 0 ? recent.slice(0, 3).map((game) => {
                  const isHome = game.homeTeamId === team.id;
                  const opp = isHome ? game.awayTeam : game.homeTeam;
                  const my = isHome ? game.homeScore : game.awayScore;
                  const op = isHome ? game.awayScore : game.homeScore;
                  const won = my > op;
                  return (
                    <Link href={`/game/${game.id}`} key={game.id} className="td-og-row">
                      <span className="td-og-date">{formatShortDate(game.date)}</span>
                      <span className="td-og-vs">{isHome ? "vs" : "@"}</span>
                      <div className="td-og-opp-logo" style={{ background: `linear-gradient(135deg, ${opp?.colors?.primary || "#444"} 0%, ${opp?.colors?.secondary || "#666"} 100%)` }}>
                        {opp?.shortName?.charAt(0) || "?"}
                      </div>
                      <span className="td-og-opp">{opp?.shortName || "TBD"}</span>
                      <span className={`td-og-wl ${won ? "W" : "L"}`}>{won ? "W" : "L"}</span>
                      <span className="td-og-score">{my}-{op}</span>
                    </Link>
                  );
                }) : <div className="td-og-empty">Үр дүн байхгүй</div>}
              </div>
              <div className="td-og-panel">
                <div className="td-og-header">
                  <h3>Удахгүй болох</h3>
                  <button className="td-og-more" onClick={() => setActiveTab("schedule")}>Бүгд →</button>
                </div>
                {upcoming.length > 0 ? upcoming.slice(0, 3).map((game) => {
                  const isHome = game.homeTeamId === team.id;
                  const opp = isHome ? game.awayTeam : game.homeTeam;
                  return (
                    <Link href={`/game/${game.id}`} key={game.id} className="td-og-row">
                      <span className="td-og-date">{formatShortDate(game.date)}</span>
                      <span className="td-og-vs">{isHome ? "vs" : "@"}</span>
                      <div className="td-og-opp-logo" style={{ background: `linear-gradient(135deg, ${opp?.colors?.primary || "#444"} 0%, ${opp?.colors?.secondary || "#666"} 100%)` }}>
                        {opp?.shortName?.charAt(0) || "?"}
                      </div>
                      <span className="td-og-opp">{opp?.shortName || "TBD"}</span>
                      <span className="td-og-scheduled">Товлосон</span>
                    </Link>
                  );
                }) : <div className="td-og-empty">Товлосон тоглолт байхгүй</div>}
              </div>
            </div>

            {/* Top Players Preview */}
            <div className="td-section">
              <div className="td-section-header">
                <h2>Гол тоглогчид</h2>
                <button className="td-og-more" onClick={() => setActiveTab("roster")}>Бүгд →</button>
              </div>
              <div className="players-grid">
                {team.players.slice(0, 4).map((player) => (
                  <PlayerCard key={player.id} player={player} teamName={team.name} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ROSTER TAB ===== */}
        {activeTab === "roster" && (
          <div className="td-tab-content">
            <div className="td-section">
              <div className="td-section-header">
                <h2><i className="fas fa-users"></i> Тоглогчид ({team.players.length})</h2>
              </div>
              <div className="players-grid">
                {team.players.map((player) => (
                  <PlayerCard key={player.id} player={player} teamName={team.name} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== SCHEDULE TAB ===== */}
        {activeTab === "schedule" && (
          <div className="td-tab-content">
            {upcoming.length > 0 && (
              <div className="td-section">
                <div className="td-section-header">
                  <h2><i className="fas fa-calendar-alt"></i> Удахгүй болох тоглолт</h2>
                </div>
                <div className="td-sched-list">
                  {upcoming.map((game) => {
                    const isHome = game.homeTeamId === team.id;
                    const opp = isHome ? game.awayTeam : game.homeTeam;
                    return (
                      <Link href={`/game/${game.id}`} key={game.id} className="td-sched-row">
                        <div className="td-sched-date">
                          <span className="td-sched-day">{formatDate(game.date)}</span>
                        </div>
                        <div className="td-sched-matchup">
                          <span className="td-sched-vs">{isHome ? "vs" : "@"}</span>
                          <div className="td-sched-opp-logo" style={{ background: `linear-gradient(135deg, ${opp?.colors?.primary || "#444"} 0%, ${opp?.colors?.secondary || "#666"} 100%)` }}>
                            {opp?.shortName?.charAt(0) || "?"}
                          </div>
                          <span className="td-sched-opp-name">{opp?.name || "TBD"}</span>
                        </div>
                        <div className="td-sched-status scheduled">
                          {game.status === "live" ? <><span className="live-dot"></span> LIVE</> : "Товлосон"}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {recent.length > 0 && (
              <div className="td-section">
                <div className="td-section-header">
                  <h2><i className="fas fa-trophy"></i> Болсон тоглолт</h2>
                </div>
                <div className="td-sched-list">
                  {recent.map((game) => {
                    const isHome = game.homeTeamId === team.id;
                    const opp = isHome ? game.awayTeam : game.homeTeam;
                    const my = isHome ? game.homeScore : game.awayScore;
                    const op = isHome ? game.awayScore : game.homeScore;
                    const won = my > op;
                    return (
                      <Link href={`/game/${game.id}`} key={game.id} className="td-sched-row">
                        <div className="td-sched-date">
                          <span className="td-sched-day">{formatDate(game.date)}</span>
                        </div>
                        <div className="td-sched-matchup">
                          <span className="td-sched-vs">{isHome ? "vs" : "@"}</span>
                          <div className="td-sched-opp-logo" style={{ background: `linear-gradient(135deg, ${opp?.colors?.primary || "#444"} 0%, ${opp?.colors?.secondary || "#666"} 100%)` }}>
                            {opp?.shortName?.charAt(0) || "?"}
                          </div>
                          <span className="td-sched-opp-name">{opp?.name || "TBD"}</span>
                        </div>
                        <div className="td-sched-result">
                          <span className={`td-sched-wl ${won ? "W" : "L"}`}>{won ? "W" : "L"}</span>
                          <span className="td-sched-score">{my}-{op}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {upcoming.length === 0 && recent.length === 0 && (
              <div className="td-empty-state">
                <i className="fas fa-calendar-times"></i>
                <p>Тоглолтын мэдээлэл байхгүй байна</p>
              </div>
            )}
          </div>
        )}

        {/* ===== STATS TAB ===== */}
        {activeTab === "stats" && (
          <div className="td-tab-content">
            <div className="td-section">
              <div className="td-section-header">
                <h2><i className="fas fa-chart-bar"></i> Багийн статистик</h2>
              </div>
              <div className="td-stats-grid">
                <div className="td-stat-card">
                  <div className="td-stat-val">{team.averages?.pointsPerGame || 0}</div>
                  <div className="td-stat-lbl">Дундаж Оноо</div>
                </div>
                <div className="td-stat-card">
                  <div className="td-stat-val">{team.averages?.reboundsPerGame || 0}</div>
                  <div className="td-stat-lbl">Дундаж Самбар</div>
                </div>
                <div className="td-stat-card">
                  <div className="td-stat-val">{team.averages?.assistsPerGame || 0}</div>
                  <div className="td-stat-lbl">Дундаж Дамжуулалт</div>
                </div>
                <div className="td-stat-card">
                  <div className="td-stat-val">{team.averages?.stealsPerGame || 0}</div>
                  <div className="td-stat-lbl">Дундаж Тасалдал</div>
                </div>
                <div className="td-stat-card">
                  <div className="td-stat-val">{team.averages?.blocksPerGame || 0}</div>
                  <div className="td-stat-lbl">Дундаж Хаалт</div>
                </div>
                <div className="td-stat-card">
                  <div className="td-stat-val">{team.winPercentage}%</div>
                  <div className="td-stat-lbl">Хожлын %</div>
                </div>
                <div className="td-stat-card">
                  <div className="td-stat-val">{team.averages?.pointsAllowedPerGame || 0}</div>
                  <div className="td-stat-lbl">Алдсан оноо</div>
                </div>
                <div className="td-stat-card">
                  <div className="td-stat-val">{team.stats.gamesPlayed}</div>
                  <div className="td-stat-lbl">Тоглосон тоглолт</div>
                </div>
              </div>
            </div>

            {/* Player Stats Table */}
            <div className="td-section">
              <div className="td-section-header">
                <h2>Тоглогчдын статистик</h2>
              </div>
              <div className="td-player-stats-table-wrapper">
                <table className="td-player-stats-table">
                  <thead>
                    <tr>
                      <th>Тоглогч</th>
                      <th>#</th>
                      <th>GP</th>
                      <th>PPG</th>
                      <th>RPG</th>
                      <th>APG</th>
                      <th>SPG</th>
                      <th>BPG</th>
                      <th>FG%</th>
                      <th>3P%</th>
                      <th>FT%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.players
                      .sort((a, b) => parseFloat(b.averages.pointsPerGame) - parseFloat(a.averages.pointsPerGame))
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <Link href={`/players/${p.id}`} className="td-pst-name">{p.name}</Link>
                          </td>
                          <td>{p.number}</td>
                          <td>{p.stats.gamesPlayed}</td>
                          <td className="td-pst-highlight">{p.averages.pointsPerGame}</td>
                          <td>{p.averages.reboundsPerGame}</td>
                          <td>{p.averages.assistsPerGame}</td>
                          <td>{p.averages.stealsPerGame}</td>
                          <td>{p.averages.blocksPerGame}</td>
                          <td>{p.averages.fieldGoalPercentage}%</td>
                          <td>{p.averages.threePointPercentage}%</td>
                          <td>{p.averages.freeThrowPercentage}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
