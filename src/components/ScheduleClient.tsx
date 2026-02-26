"use client";

import { useState, useMemo, useEffect } from "react";
import DateSlider from "./DateSlider";
import GameCard from "./GameCard";
import { GameWithTeams, Team } from "@/types";
import {
  useActiveSeason,
  useGames,
  useTeams,
  FirestoreTeam,
} from "@/lib/firestore-hooks";

function formatDateShort(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatDateShort(today);
}

export default function ScheduleClient() {
  const { season, loading: seasonLoading } = useActiveSeason();
  const seasonId = season?.id ?? null;
  const { games: firestoreGames, loading: gamesLoading } = useGames(seasonId);
  const { teams: firestoreTeams, loading: teamsLoading } = useTeams(seasonId);

  // Build a team map and convert Firestore games to GameWithTeams
  const games: GameWithTeams[] = useMemo(() => {
    if (!firestoreGames.length) return [];
    const teamMap = new Map<string, FirestoreTeam>();
    firestoreTeams.forEach((t) => teamMap.set(t.id, t));

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
  }, [firestoreGames, firestoreTeams]);

  // Use empty string initially to avoid hydration mismatch
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  const dataLoading = seasonLoading || gamesLoading || teamsLoading;

  // Set today's date on client only
  useEffect(() => {
    const today = getTodayString();
    setTodayStr(today);
    setSelectedDate(today);
    setMounted(true);
  }, []);

  // Count games by date
  const gamesCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    games.forEach((game) => {
      const dateStr = game.date;
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    return counts;
  }, [games]);

  // Filter games by selected date
  const filteredGames = useMemo(() => {
    if (!selectedDate) return [];
    return games.filter((game) => game.date === selectedDate);
  }, [games, selectedDate]);

  // Separate finished and scheduled games
  const finishedGames = filteredGames.filter((g) => g.status === "finished");
  const scheduledGames = filteredGames.filter(
    (g) => g.status === "scheduled" || g.status === "live",
  );
  const liveGames = filteredGames.filter((g) => g.status === "live");

  // Consistent date formatting to avoid hydration mismatch
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";

    const months = [
      "1-р сарын",
      "2-р сарын",
      "3-р сарын",
      "4-р сарын",
      "5-р сарын",
      "6-р сарын",
      "7-р сарын",
      "8-р сарын",
      "9-р сарын",
      "10-р сарын",
      "11-р сарын",
      "12-р сарын",
    ];
    const weekdays = [
      "Ням",
      "Даваа",
      "Мягмар",
      "Лхагва",
      "Пүрэв",
      "Баасан",
      "Бямба",
    ];

    const date = new Date(dateStr + "T00:00:00");
    const year = date.getFullYear();
    const month = months[date.getMonth()];
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];

    return `${year} оны ${month} ${day}, ${weekday} гараг`;
  };

  const isToday = (dateStr: string) => {
    return dateStr === todayStr;
  };

  const isPast = (dateStr: string) => {
    if (!todayStr || !dateStr) return false;
    return dateStr < todayStr;
  };

  // Show loading state during SSR or while fetching data
  if (!mounted || dataLoading) {
    return (
      <div className="schedule-wrapper">
        <div className="schedule-loading">
          <div className="loading-spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-wrapper">
      {/* Date Slider */}
      <DateSlider
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        gamesCountByDate={gamesCountByDate}
      />

      {/* Selected Date Display */}
      <div
        className={`selected-date-header ${isToday(selectedDate) ? "is-today" : ""}`}
      >
        <div className="date-info">
          <h2>
            {isToday(selectedDate) ? (
              <>
                <span className="today-badge">
                  <i className="fas fa-star"></i> ӨНӨӨДӨР
                </span>
                <span className="date-text">
                  {formatDisplayDate(selectedDate)}
                </span>
              </>
            ) : (
              <>
                <i
                  className={`fas ${isPast(selectedDate) ? "fa-history" : "fa-calendar-day"}`}
                ></i>
                <span className="date-text">
                  {formatDisplayDate(selectedDate)}
                </span>
              </>
            )}
          </h2>
        </div>
        <div className="games-summary">
          {filteredGames.length > 0 ? (
            <>
              <span className="games-total">
                {filteredGames.length} тоглолт
              </span>
              {liveGames.length > 0 && (
                <span className="live-badge">
                  <span className="live-dot"></span>
                  {liveGames.length} LIVE
                </span>
              )}
            </>
          ) : (
            <span className="games-total empty">Тоглолт байхгүй</span>
          )}
        </div>
      </div>

      {/* No Games Message */}
      {filteredGames.length === 0 && (
        <div className="no-games-message">
          <div className="no-games-icon">
            <i className="fas fa-basketball-ball"></i>
          </div>
          <p>
            Энэ өдөр тоглолт{" "}
            {isPast(selectedDate) ? "болоогүй" : "товлогдоогүй"} байна
          </p>
          <span>Өөр өдөр сонгоно уу</span>
        </div>
      )}

      {/* Live Games - Show First */}
      {liveGames.length > 0 && (
        <section className="schedule-section live-section">
          <div className="section-header">
            <h3>
              <span className="live-indicator"></span>
              ШУУД ДАМЖУУЛЖ БАЙНА
            </h3>
          </div>
          <div className="games-grid">
            {liveGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      {/* Finished Games - Show Results */}
      {finishedGames.length > 0 && (
        <section className="schedule-section finished-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-check-circle"></i> Тоглолтын үр дүн
            </h3>
            <span className="section-count">
              {finishedGames.length} тоглолт
            </span>
          </div>
          <div className="games-grid">
            {finishedGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      {/* Scheduled Games - Show Schedule */}
      {scheduledGames.filter((g) => g.status !== "live").length > 0 && (
        <section className="schedule-section upcoming-section">
          <div className="section-header">
            <h3>
              <i className="fas fa-clock"></i> Удахгүй болох тоглолтууд
            </h3>
            <span className="section-count">
              {scheduledGames.filter((g) => g.status !== "live").length} тоглолт
            </span>
          </div>
          <div className="games-grid">
            {scheduledGames
              .filter((g) => g.status !== "live")
              .map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
