import type { Notification } from "./notification.types";

export const notifications: Notification[] = [
  {
    id: "1",
    title: "Repository Indexed",
    message: "Frontend repository indexed successfully.",
    type: "success",
    createdAt: "2 min ago",
    read: false,
  },
  {
    id: "2",
    title: "AI Analysis Completed",
    message: "Overall quality score: 92%.",
    type: "info",
    createdAt: "8 min ago",
    read: false,
  },
  {
    id: "3",
    title: "Security Scan",
    message: "No critical vulnerabilities detected.",
    type: "success",
    createdAt: "15 min ago",
    read: true,
  },
  {
    id: "4",
    title: "Unit Tests",
    message: "126 tests passed successfully.",
    type: "success",
    createdAt: "22 min ago",
    read: true,
  },
];