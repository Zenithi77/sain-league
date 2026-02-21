import ScheduleClient from '@/components/ScheduleClient';
import { getGamesWithTeams } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const games = getGamesWithTeams();

  return (
    <main className="main-content">
      <div className="page-header schedule-page-header">
        <div className="page-header-content">
          <h1><i className="fas fa-calendar-alt"></i> Тоглолтын хуваарь</h1>
          <p>Өдөр сонгоод тухайн өдрийн тоглолтуудыг харна уу</p>
        </div>
      </div>

      <ScheduleClient games={games} />
    </main>
  );
}
