import { apiClient } from './apiClient';
import { Job, JobApplication } from './candidateApi';

export const recruiterApi = {
  getMyJobs: async (): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>('/Jobs/recruiter');
    return response.data;
  },

  closeJob: async (jobId: string): Promise<void> => {
    await apiClient.patch(`/Jobs/${jobId}/close`);
  },

  getJobApplications: async (jobId: string): Promise<JobApplication[]> => {
    const response = await apiClient.get<JobApplication[]>(`/JobApplications/job/${jobId}`);
    return response.data;
  },

  getInterviews: async (): Promise<JobApplication[]> => {
    const response = await apiClient.get<JobApplication[]>('/JobApplications/interviews');
    return response.data;
  },

  updateApplicationStatus: async (applicationId: string, status: number): Promise<void> => {
    await apiClient.patch(`/JobApplications/${applicationId}/status`, { status });
  },

  getCredits: async (): Promise<{ availableCredits: number }> => {
    const response = await apiClient.get<{ availableCredits: number }>('/recruiter/credits');
    return response.data;
  },
};
