export interface ConversationDto {
  id: string;
  projectId?: string;
  provider: string;
  model: string;
  title: string | null;
  userName: string;
  createdAt: string;
  updatedAt: string;
  eventCount: number;
  summaryCount: number;
}
