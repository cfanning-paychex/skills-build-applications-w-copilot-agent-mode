import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

type LeaderboardResponse = { leaderboard: LeaderboardEntry[] };

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    getJson<LeaderboardResponse>('/api/leaderboard')
      .then(({ leaderboard }) => {
        if (active) setEntries(leaderboard);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load leaderboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals.">
      {loading ? <p role="status">Loading leaderboard...</p> : error ? <p role="alert">Unable to load leaderboard: {error}</p> : entries.length === 0 ? <p>No leaderboard rankings yet.</p> : (
        <ol className="list-group list-group-numbered">
          {entries.map((entry) => (
            <li className="list-group-item" key={entry.teamName}>
              <strong>{entry.teamName}</strong> — {entry.totalPoints} points
              <span className="visually-hidden">, rank {entry.rank}</span>
            </li>
          ))}
        </ol>
      )}
    </CapabilityCard>
  );
}
