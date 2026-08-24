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
      title: "Connect Repository",
      icon: Upload,
      onClick: () => navigate("/projects"),
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
    <section className="rounded-lg border border-[#dfe4eb] bg-white p-5 md:p-6">
      <h2 className="mb-5 text-lg font-semibold text-[#172033]">
        Quick Actions
      </h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              onClick={action.onClick}
              className="flex items-center gap-4 rounded-lg border border-[#dfe4eb] bg-[#fbfcfe] p-4 text-left transition hover:border-[#9abff2] hover:bg-[#f3f7fd]"
            >
              <span className="rounded-md bg-[#e8f1ff] p-2 text-[#1264d8]"><Icon size={19} /></span>

              <span className="font-medium text-[#344054]">
                {action.title}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default QuickActions;