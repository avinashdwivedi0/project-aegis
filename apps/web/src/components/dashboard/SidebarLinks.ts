import {
  LayoutDashboard,
  FolderKanban,
  FolderGit2,
  Bot,
  FlaskConical,
  FileBarChart,
  BrainCircuit,
  Settings,
} from "lucide-react";

export const sidebarLinks = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    title: "Projects",
    icon: FolderKanban,
    path: "/projects",
  },
  {
    title: "Repository",
    icon: FolderGit2,
    path: "/repository",
  },
  {
    title: "AI Analysis",
    icon: Bot,
    path: "/analysis",
  },
  {
    title: "Testing",
    icon: FlaskConical,
    path: "/testing",
  },
  {
    title: "Reports",
    icon: FileBarChart,
    path: "/reports",
  },
  {
    title: "Memory",
    icon: BrainCircuit,
    path: "/memory",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
  },
];