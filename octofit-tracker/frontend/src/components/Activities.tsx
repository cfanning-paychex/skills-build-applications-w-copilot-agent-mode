import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
};

type ActivityResponse = { activities: Activity[] };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    getJson<ActivityResponse>('/api/activities')
      .then(({ activities: records }) => {
        if (active) setActivities(records);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load activities.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points.">
      {loading ? <p role="status">Loading activities...</p> : error ? <p role="alert">Unable to load activities: {error}</p> : activities.length === 0 ? <p>No activities yet.</p> : (
        <ul className="list-group">
          {activities.map((activity, index) => (
            <li className="list-group-item" key={activity._id ?? `${activity.type}-${index}`}>
              <strong>{activity.type}</strong> — {activity.minutes} minutes, {activity.points} points
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
