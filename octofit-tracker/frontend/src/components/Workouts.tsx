import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  _id?: string;
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

type WorkoutResponse = { suggestions: WorkoutSuggestion[] };
const userEmail = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    getJson<WorkoutResponse>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions: records }) => {
        if (active) setSuggestions(records);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load workout suggestions.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
      {loading ? <p role="status">Loading workout suggestions...</p> : error ? <p role="alert">Unable to load workout suggestions: {error}</p> : suggestions.length === 0 ? <p>No workout suggestions yet.</p> : (
        <ul className="list-group">
          {suggestions.map((workout, index) => (
            <li className="list-group-item" key={workout._id ?? workout.title ?? index}>
              <strong>{workout.title}</strong>
              {workout.focus && <> — {workout.focus}</>}
              {workout.minutes !== undefined && <> · {workout.minutes} minutes</>}
              {workout.difficulty && <> · {workout.difficulty}</>}
              {workout.reason && <p className="mb-0">{workout.reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
