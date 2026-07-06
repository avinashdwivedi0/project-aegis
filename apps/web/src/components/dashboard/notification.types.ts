export type NotificationType =
  | "success"
  | "warning"
  | "error"
  | "info";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
}