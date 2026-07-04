export interface NotificationRow {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}
