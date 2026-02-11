import ScheduleClient from '@/components/ScheduleClient';
import { getGamesWithTeams } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const games = getGamesWithTeams();

  return (
    <main className="main-content">
      <div className="page-header">
        <h1><i className="fas fa-calendar-alt"></i> Тоглолтын хуваарь</h1>
        <p>Огноо сонгоод тухайн өдрийн тоглолтуудыг харна уу</p>
      </div>

      <ScheduleClient games={games} />
    </main>
  );
}
