import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/helpers';

export async function ActivityList({ goalId }: { goalId: string }) {
  const supabase = await createClient();
  
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false });

  const activitiesArray = (activities as Array<{ id: string; content: string; created_at: string }> | null) || [];

  if (activitiesArray.length === 0) {
    return (
      <p className="text-sm text-text-secondary mt-4">
        まだ活動記録がありません
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {await Promise.all(
        activitiesArray.map(async (activity) => {
          const { data: reflections } = await supabase
            .from('reflections')
            .select('*')
            .eq('activity_id', activity.id)
            .order('created_at', { ascending: false });

          const reflectionsArray = (reflections as Array<{ id: string; content: string; created_at: string }> | null) || [];

          return (
            <div
              key={activity.id}
              className="pl-4 border-l-2 border-primary/30"
            >
              <p className="text-text-primary whitespace-pre-wrap">
                {activity.content}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {formatDateTime(activity.created_at)}
              </p>
              {reflectionsArray.length > 0 && (
                <div className="mt-2 space-y-2">
                  {reflectionsArray.map((reflection) => (
                    <div
                      key={reflection.id}
                      className="pl-4 border-l-2 border-accent/30"
                    >
                      <p className="text-text-primary whitespace-pre-wrap text-sm">
                        {reflection.content}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {formatDateTime(reflection.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

