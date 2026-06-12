export interface SearchResultDto {
  eventId: string;
  snippet: string;
  score: number;
}

export interface SearchResponseDto {
  results: SearchResultDto[];
  contextBlock: string;
  snippetCount: number;
  tokensUsed: number;
  truncated: boolean;
}
