import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = {
  _id?: string;
  name: string;
  mascot?: string;
  members?: string[];
};

type TeamResponse = { teams: Team[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    getJson<TeamResponse>('/api/teams')
      .then(({ teams: records }) => {
        if (active) setTeams(records);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load teams.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard title="Teams" description="Manage teams and members.">
      {loading ? <p role="status">Loading teams...</p> : error ? <p role="alert">Unable to load teams: {error}</p> : teams.length === 0 ? <p>No teams yet.</p> : (
        <ul className="list-group">
          {teams.map((team, index) => (
            <li className="list-group-item" key={team._id ?? team.name ?? index}>
              <strong>{team.name}</strong>
              {team.mascot && <> — Mascot: {team.mascot}</>}
              <div>{team.members?.length ?? 0} members</div>
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
