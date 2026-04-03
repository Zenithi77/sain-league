"use client";

import { useMemo } from "react";
import Link from "next/link";
import SeasonBanner from "@/components/SeasonBanner";
import StandingsTable from "@/components/StandingsTable";
import GameCard from "@/components/GameCard";
import SponsorLogos from "@/components/SponsorLogos";
import PodcastPreview from "@/components/PodcastPreview";
import {
  useActiveSeason,
  useStandings,
  useTeams,
  useGames,
  usePlayerAggregates,
  FirestoreTeam,
  PlayerAggregateDoc,
} from "@/lib/firestore-hooks";
import { GameWithTeams, Team } from "@/types";

function TopPlayersSection({
  players,
  getValue,
  statLabel,
  teamMap,
}: {
  players: PlayerAggregateDoc[];
  getValue: (p: PlayerAggregateDoc) => number;
  statLabel: string;
  teamMap: Map<string, FirestoreTeam>;
}) {
  return (
    <div className="category-list">
      {players.map((player, index) => (
        <div
          key={player.playerId}
          className="player-item"
          onClick={() => (window.location.href = `/players/${player.playerId}`)}
        >
          <span className="player-rank">{index + 1}</span>
          <div className="player-info">
            <span className="player-name">{player.playerName}</span>
            <span className="player-team">
              {teamMap.get(player.teamId)?.shortName || ""}
            </span>
          </div>
          <span className="player-stat">
            {getValue(player).toFixed(1)} <small>{statLabel}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { season, loading: seasonLoading } = useActiveSeason();
  const seasonId = season?.id ?? null;
  const { standings, loading: standingsLoading } = useStandings(seasonId);
  const { teams, loading: teamsLoading } = useTeams();
  const { games: firestoreGames, loading: gamesLoading } = useGames(seasonId);
  const { aggregates: playerAggregates, loading: playersLoading } =
    usePlayerAggregates(seasonId);

  const loading =
    seasonLoading ||
    standingsLoading ||
    teamsLoading ||
    gamesLoading ||
    playersLoading;

  const teamMap = useMemo(() => {
    const map = new Map<string, FirestoreTeam>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const games: GameWithTeams[] = useMemo(() => {
    if (!firestoreGames.length) return [];
    return firestoreGames.map((g) => {
      const home = teamMap.get(g.homeTeamId) ?? null;
      const away = teamMap.get(g.awayTeamId) ?? null;
      return {
        id: g.id,
        date: g.date,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        status: g.status as GameWithTeams["status"],
        playerStats: [],
        homeTeam: home ? (home as unknown as Team) : null,
        awayTeam: away ? (away as unknown as Team) : null,
      };
    });
  }, [firestoreGames, teamMap]);

  const upcomingGames = useMemo(() => {
    return games.filter((g) => g.status === "scheduled").slice(0, 6);
  }, [games]);

  const topScorers = useMemo(() => {
    return [...playerAggregates]
      .sort(
        (a, b) =>
          b.points / (b.gamesPlayed || 1) - a.points / (a.gamesPlayed || 1),
      )
      .slice(0, 5);
  }, [playerAggregates]);

  const topRebounders = useMemo(() => {
    return [...playerAggregates]
      .sort(
        (a, b) =>
          b.totalRebounds / (b.gamesPlayed || 1) -
          a.totalRebounds / (a.gamesPlayed || 1),
      )
      .slice(0, 5);
  }, [playerAggregates]);

  const topAssisters = useMemo(() => {
    return [...playerAggregates]
      .sort(
        (a, b) =>
          b.assists / (b.gamesPlayed || 1) - a.assists / (a.gamesPlayed || 1),
      )
      .slice(0, 5);
  }, [playerAggregates]);

  return (
    <>
      <SeasonBanner />
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-left">
              <span className="featured-tag">ОНЦЛОХ</span>
              <h1 className="hero-title">
                Sain Girls League {season?.year ?? 2026}
              </h1>
              <p className="hero-description">
                Монголын охидын сагсан бөмбөгийн лигт тавтай морилно уу.{" "}
                {teams.length} баг, шилдэг тоглогчид, хурц тоглолтууд таныг
                хүлээж байна.
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
              <span className="stat-number">{teams.length}</span>
              <span className="stat-label">Багууд</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-user"></i>
            </div>
            <div className="stat-info">
              <span className="stat-number">{playerAggregates.length}</span>
              <span className="stat-label">Тоглогчид</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-calendar"></i>
            </div>
            <div className="stat-info">
              <span className="stat-number">{firestoreGames.length}</span>
              <span className="stat-label">Тоглолтууд</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-trophy"></i>
            </div>
            <div className="stat-info">
              <span className="stat-number">{season?.year ?? 2026}</span>
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
                <h3>{season?.year ?? 2026} Улирал Нээлтээ Хийлээ</h3>
                <p>
                  Sain Girls League-ийн {season?.year ?? 2026} оны улирал албан
                  ёсоор нээлтээ хийлээ. {teams.length} баг шинэ улирлыг угтаж
                  байна.
                </p>
              </div>
            </div>
            <div className="side-news">
              <div className="side-news-card">
                <h4>Тоглолтын Хуваарь Гарлаа</h4>
                <p>
                  {season?.year ?? 2026} улирлын бүх тоглолтын хуваарийг одоо
                  харах боломжтой
                </p>
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
          {loading ? (
            <p style={{ textAlign: "center", padding: 40 }}>Уншиж байна...</p>
          ) : standings.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
              Мэдээлэл олдсонгүй
            </p>
          ) : (
            <StandingsTable standings={standings} teamMap={teamMap} limit={8} />
          )}
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
          {loading ? (
            <p style={{ textAlign: "center", padding: 40 }}>Уншиж байна...</p>
          ) : playerAggregates.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
              Мэдээлэл олдсонгүй
            </p>
          ) : (
            <div className="players-categories">
              <div className="category-card">
                <h3>
                  <i className="fas fa-basketball-ball"></i> Оноо
                </h3>
                <TopPlayersSection
                  players={topScorers}
                  getValue={(p) => p.points / (p.gamesPlayed || 1)}
                  statLabel="PTS"
                  teamMap={teamMap}
                />
              </div>
              <div className="category-card">
                <h3>
                  <i className="fas fa-hand-rock"></i> Самбар
                </h3>
                <TopPlayersSection
                  players={topRebounders}
                  getValue={(p) => p.totalRebounds / (p.gamesPlayed || 1)}
                  statLabel="REB"
                  teamMap={teamMap}
                />
              </div>
              <div className="category-card">
                <h3>
                  <i className="fas fa-hands-helping"></i> Дамжуулалт
                </h3>
                <TopPlayersSection
                  players={topAssisters}
                  getValue={(p) => p.assists / (p.gamesPlayed || 1)}
                  statLabel="AST"
                  teamMap={teamMap}
                />
              </div>
            </div>
          )}
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
            {loading ? (
              <p style={{ textAlign: "center", padding: 40 }}>Уншиж байна...</p>
            ) : upcomingGames.length > 0 ? (
              upcomingGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))
            ) : (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
                Удахгүй болох тоглолт байхгүй байна
              </p>
            )}
          </div>
        </section>

        {/* Sponsors / Partners */}
        <SponsorLogos />

        {/* Podcast Preview */}
        <PodcastPreview />
      </main>
    </>
  );
}
