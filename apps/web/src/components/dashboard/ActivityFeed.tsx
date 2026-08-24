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
    <section className="rounded-lg border border-[#dfe4eb] bg-white p-5 md:p-6">
      <h2 className="mb-5 text-lg font-semibold text-[#172033]">
        Recent Activity
      </h2>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 rounded-lg border border-[#edf0f4] bg-[#fbfcfe] p-4"
          >
            <div className="rounded-md bg-[#e8f1ff] p-2">
              <Clock3
                size={18}
                className="text-[#1264d8]"
              />
            </div>

            <div>
              <p className="font-medium">
                {activity.title}
              </p>

              <p className="text-sm text-[#667085]">
                {activity.description}
              </p>

              <p className="mt-1 text-xs text-[#98a2b3]">
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ActivityFeed;