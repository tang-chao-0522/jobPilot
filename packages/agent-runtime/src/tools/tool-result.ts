export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; retryable: boolean };
  metadata?: { latencyMs?: number };
  terminate?: boolean;
}
