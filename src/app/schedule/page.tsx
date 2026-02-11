import ScheduleClient from '@/components/ScheduleClient';
import { GameWithTeams } from '@/types';

async function getGames(): Promise<GameWithTeams[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/games`, {
    cache: 'no-store',
  });
  return res.json();
}

export default async function SchedulePage() {
  const games = await getGames();

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
