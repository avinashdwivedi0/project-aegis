import { Clock3 } from "lucide-react";

const activities = [
  {
    id: 1,
    title: "Project created",
    description: "Project Aegis",
    time: "Just now",
  },
];

function ActivityFeed() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-6 text-xl font-semibold">
        Recent Activity
      </h2>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
          >
            <div className="rounded-lg bg-cyan-500/10 p-2">
              <Clock3
                size={18}
                className="text-cyan-400"
              />
            </div>

            <div>
              <p className="font-medium">
                {activity.title}
              </p>

              <p className="text-sm text-slate-400">
                {activity.description}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityFeed;