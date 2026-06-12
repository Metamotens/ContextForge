export interface PromptEventDto {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  isSummary: boolean;
  createdAt: string;
}
