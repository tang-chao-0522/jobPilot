import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

const fetchData = <T>(url: string, params?: Record<string, string>) =>
  api.get<T>(url, { params }).then((response) => response.data);

export function useDashboardQuery() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => fetchData<any>('/dashboard') });
}

export function useResumesQuery() {
  return useQuery({ queryKey: ['resumes'], queryFn: () => fetchData<any[]>('/resumes') });
}

export function useJobsQuery(search: string) {
  return useQuery({
    queryKey: ['jobs', search],
    queryFn: () => fetchData<any[]>('/jobs', { search }),
  });
}

export function useJobQuery(jobId?: string) {
  return useQuery({
    queryKey: ['job', jobId],
    enabled: Boolean(jobId),
    queryFn: () => fetchData<any>(`/jobs/${jobId}`),
  });
}

export function useApplicationsQuery() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: () => fetchData<any[]>('/applications'),
  });
}

export function useTasksQuery() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchData<any[]>('/preparation/tasks'),
  });
}

export function useAgentThreadsQuery() {
  return useQuery({
    queryKey: ['threads'],
    queryFn: () => fetchData<any[]>('/agent/threads'),
  });
}

export function useAgentMessagesQuery(threadId?: string) {
  return useQuery({
    queryKey: ['messages', threadId],
    enabled: Boolean(threadId),
    queryFn: () => fetchData<any[]>(`/agent/threads/${threadId}/messages`),
  });
}

export function useInterviewQuery(sessionId?: string) {
  return useQuery({
    queryKey: ['interview', sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => fetchData<any>(`/interviews/${sessionId}`),
  });
}
