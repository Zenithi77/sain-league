'use client';

import { useState, useMemo } from 'react';
import DateSlider from './DateSlider';
import GameCard from './GameCard';
import { GameWithTeams } from '@/types';

interface ScheduleClientProps {
  games: GameWithTeams[];
}

function formatDateShort(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function ScheduleClient({ games }: ScheduleClientProps) {
  const [selectedDate, setSelectedDate] = useState<string>(formatDateShort(new Date()));

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
    return games.filter((game) => game.date === selectedDate);
  }, [games, selectedDate]);

  // Separate finished and scheduled games
  const finishedGames = filteredGames.filter((g) => g.status === 'finished');
  const scheduledGames = filteredGames.filter((g) => g.status === 'scheduled' || g.status === 'live');

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('mn-MN', options);
  };

  const isToday = (dateStr: string) => {
    return dateStr === formatDateShort(new Date());
  };

  return (
    <>
      {/* Date Slider */}
      <DateSlider
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        gamesCountByDate={gamesCountByDate}
      />

      {/* Selected Date Display */}
      <div className="selected-date-header">
        <h2>
          {isToday(selectedDate) ? (
            <><i className="fas fa-star"></i> Өнөөдөр - {formatDisplayDate(selectedDate)}</>
          ) : (
            <><i className="fas fa-calendar-day"></i> {formatDisplayDate(selectedDate)}</>
          )}
        </h2>
        <span className="games-total">
          {filteredGames.length > 0 
            ? `${filteredGames.length} тоглолт` 
            : 'Тоглолт байхгүй'}
        </span>
      </div>

      {/* No Games Message */}
      {filteredGames.length === 0 && (
        <div className="no-games-message">
          <i className="fas fa-basketball-ball"></i>
          <p>Энэ өдөр тоглолт товлогдоогүй байна</p>
          <span>Өөр өдөр сонгоно уу</span>
        </div>
      )}

      {/* Finished Games - Show Results */}
      {finishedGames.length > 0 && (
        <section className="schedule-section">
          <div className="section-header">
            <h3><i className="fas fa-check-circle"></i> Тоглолтын үр дүн</h3>
          </div>
          <div className="games-grid">
            {finishedGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      {/* Scheduled Games - Show Schedule */}
      {scheduledGames.length > 0 && (
        <section className="schedule-section">
          <div className="section-header">
            <h3><i className="fas fa-clock"></i> Тоглолтын хуваарь</h3>
          </div>
          <div className="games-grid">
            {scheduledGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
