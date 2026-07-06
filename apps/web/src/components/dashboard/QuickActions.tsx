import { useNavigate } from "react-router-dom";
import {
  FolderPlus,
  Upload,
  Bot,
  FileText,
} from "lucide-react";

function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "New Project",
      icon: FolderPlus,
      onClick: () => navigate("/projects"),
    },
    {
      title: "Upload Repository",
      icon: Upload,
      onClick: () => navigate("/repository"),
    },
    {
      title: "Start AI Analysis",
      icon: Bot,
      onClick: () => navigate("/analysis"),
    },
    {
      title: "Generate Report",
      icon: FileText,
      onClick: () => navigate("/reports"),
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-6 text-xl font-semibold">
        Quick Actions
      </h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              onClick={action.onClick}
              className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-950 p-4 transition hover:border-cyan-500 hover:bg-slate-800"
            >
              <Icon className="text-cyan-400" size={22} />

              <span className="font-medium">
                {action.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActions;