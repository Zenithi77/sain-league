"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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

const MN_WEEKDAYS = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];
const MN_MONTHS_SHORT = [
  "1 сар",
  "2 сар",
  "3 сар",
  "4 сар",
  "5 сар",
  "6 сар",
  "7 сар",
  "8 сар",
  "9 сар",
  "10 сар",
  "11 сар",
  "12 сар",
];

// Generate dates: 7 days before and 7 days after today
function generateDates(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arr: Date[] = [];
  for (let i = -7; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    arr.push(d);
  }
  return arr;
}

export default function ScheduleClient() {
  const { season, loading: seasonLoading } = useActiveSeason();
  const seasonId = season?.id ?? null;
  const { games: firestoreGames, loading: gamesLoading } = useGames(seasonId);
  const { teams: firestoreTeams, loading: teamsLoading } = useTeams(seasonId);

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

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [dates, setDates] = useState<Date[]>([]);

  const tickerRef = useRef<HTMLDivElement>(null);
  const dateBarRef = useRef<HTMLDivElement>(null);

  const dataLoading = seasonLoading || gamesLoading || teamsLoading;

  useEffect(() => {
    const today = getTodayString();
    setTodayStr(today);
    setSelectedDate(today);
    setDates(generateDates());
    setMounted(true);
  }, []);

  // Count games by date
  const gamesCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    games.forEach((game) => {
      counts[game.date] = (counts[game.date] || 0) + 1;
    });
    return counts;
  }, [games]);

  // Filter games for selected date
  const filteredGames = useMemo(() => {
    if (!selectedDate) return [];
    return games.filter((game) => game.date === selectedDate);
  }, [games, selectedDate]);

  // All games sorted by date for the ticker
  const allGamesSorted = useMemo(() => {
    return [...games].sort((a, b) => a.date.localeCompare(b.date));
  }, [games]);

  // Scroll the ticker
  const scrollTicker = useCallback((direction: "left" | "right") => {
    if (!tickerRef.current) return;
    const scrollAmount = 300;
    tickerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  // Scroll date bar
  const scrollDateBar = useCallback((direction: "left" | "right") => {
    if (!dateBarRef.current) return;
    dateBarRef.current.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    });
  }, []);

  // Scroll to selected date in date bar
  useEffect(() => {
    if (!mounted || !dateBarRef.current) return;
    const el = dateBarRef.current.querySelector(
      `[data-date="${selectedDate}"]`
    ) as HTMLElement;
    if (el) {
      const container = dateBarRef.current;
      const scrollPos =
        el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({
        left: Math.max(0, scrollPos),
        behavior: "smooth",
      });
    }
  }, [selectedDate, mounted]);

  if (!mounted || dataLoading) {
    return (
      <div className="nba-schedule-wrapper">
        <div className="nba-ticker-loading">
          <div className="loading-spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nba-schedule-wrapper">
      {/* ========== NBA-STYLE GAME TICKER ========== */}
      <div className="nba-ticker-section">
        <button
          className="nba-ticker-arrow left"
          onClick={() => scrollTicker("left")}
          aria-label="Өмнөх"
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        <div className="nba-ticker-track" ref={tickerRef}>
          {allGamesSorted.length > 0 ? (
            allGamesSorted.map((game) => (
              <GameCard key={game.id} game={game} variant="ticker" />
            ))
          ) : (
            <div className="nba-ticker-empty">
              <i className="fas fa-basketball-ball"></i>
              <span>Тоглолт байхгүй байна</span>
            </div>
          )}
        </div>

        <button
          className="nba-ticker-arrow right"
          onClick={() => scrollTicker("right")}
          aria-label="Дараах"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      {/* ========== DATE BAR (NBA Secondary Nav) ========== */}
      <div className="nba-date-bar">
        <button
          className="nba-date-arrow"
          onClick={() => scrollDateBar("left")}
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        <div className="nba-date-track" ref={dateBarRef}>
          {dates.map((date) => {
            const dateStr = formatDateShort(date);
            const gamesCount = gamesCountByDate[dateStr] || 0;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                data-date={dateStr}
                className={`nba-date-item ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <span className="nba-date-day">
                  {MN_WEEKDAYS[date.getDay()]}
                </span>
                <span className="nba-date-num">
                  {MN_MONTHS_SHORT[date.getMonth()]} {date.getDate()}
                </span>
                {gamesCount > 0 && (
                  <span className="nba-date-games">{gamesCount}</span>
                )}
                {isToday && <span className="nba-today-dot"></span>}
              </button>
            );
          })}
        </div>

        <button
          className="nba-date-arrow"
          onClick={() => scrollDateBar("right")}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      {/* ========== SELECTED DATE GAMES ========== */}
      <div className="nba-games-section">
        <div className="nba-games-header">
          <h2>
            {selectedDate === todayStr ? (
              <span className="nba-today-label">ӨНӨӨДРИЙН ТОГЛОЛТУУД</span>
            ) : (
              <span>
                {(() => {
                  const d = new Date(selectedDate + "T00:00:00");
                  return `${MN_MONTHS_SHORT[d.getMonth()]} ${d.getDate()} - Тоглолтууд`;
                })()}
              </span>
            )}
          </h2>
          <span className="nba-games-count">{filteredGames.length} тоглолт</span>
        </div>

        {filteredGames.length === 0 ? (
          <div className="nba-no-games">
            <div className="nba-no-games-icon">
              <i className="fas fa-basketball-ball"></i>
            </div>
            <h3>Тоглолт байхгүй</h3>
            <p>Энэ өдөр тоглолт товлогдоогүй байна</p>
          </div>
        ) : (
          <div className="nba-games-grid">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
