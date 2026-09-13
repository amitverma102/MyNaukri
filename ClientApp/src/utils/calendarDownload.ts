import api, { API_BASE_URL } from '../api/axios';

/**
 * Downloads the .ics calendar invite for an interview using a same-origin Blob URL.
 * This guarantees the browser's download attribute is honored on all browsers
 * without navigating away from the current dashboard or opening a blank tab.
 */
export const downloadCalendarInvite = async (applicationId: string, customFilename?: string): Promise<void> => {
  const filename = customFilename || `interview_${applicationId.substring(0, 8)}.ics`;
  try {
    const response = await api.get(`/jobapplications/${applicationId}/interview.ics`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/calendar;charset=utf-8' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(blobUrl);
    }, 200);
  } catch (error) {
    console.warn('Direct blob download failed, falling back to direct URL:', error);
    // Fallback: direct window open with correct /api/ prefix
    const fallbackUrl = `${API_BASE_URL}/api/jobapplications/${applicationId}/interview.ics`;
    window.open(fallbackUrl, '_blank');
  }
};
