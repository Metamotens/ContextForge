export interface ConversationDto {
  id: string;
  projectId?: string;
  provider: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  eventCount: number;
  summaryCount: number;
}
