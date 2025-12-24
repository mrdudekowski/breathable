// Stub API layer, will be replaced when backend is ready

export interface SaveProgressRequest {
  practiceId: string;
  completedCycles: number;
  totalTime: number;
  timestamp: number;
}

export interface GetUserStatsResponse {
  totalSessions: number;
  totalTime: number;
  practicesCompleted: Record<string, number>;
  lastSessionDate?: string;
}

export interface SaveProgressResponse {
  success: boolean;
  sessionId?: string;
}

export const saveProgress = async (data: SaveProgressRequest): Promise<SaveProgressResponse> => {
  // TODO: Реализовать при подключении бэкенда
  if (import.meta.env.DEV) {
    console.warn('Save progress (stub):', data);
  }
  return Promise.resolve({
    success: true,
    sessionId: `session_${Date.now()}`,
  });
};

export const getUserStats = async (): Promise<GetUserStatsResponse> => {
  // TODO: Реализовать при подключении бэкенда
  if (import.meta.env.DEV) {
    console.warn('Get user stats (stub)');
  }
  return Promise.resolve({
    totalSessions: 0,
    totalTime: 0,
    practicesCompleted: {},
  });
};

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string) || 'https://api.example.com';
