import {
  LayoutDashboard,
  FolderKanban,
  Bot,
  FlaskConical,
  FileBarChart,
  Activity,
  BrainCircuit,
  Settings,
  ShieldCheck,
  ShieldAlert,
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
  // {
  //   title: "Repository",
  //   icon: FolderGit2,
  //   path: "/repository",
  // },
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
    title: "Test Intelligence",
    icon: Activity,
    path: "/test-operations",
  },
  {
    title: "Self-Healing",
    icon: ShieldAlert,
    path: "/self-healing",
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
  {
    title: "CI/CD Integration",
    icon: FileBarChart,
    path: "/ci-integration",
  },
  {
    title: "Audit Log",
    icon: ShieldCheck,
    path: "/audit",
  },
];