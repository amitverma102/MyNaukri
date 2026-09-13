/**
 * Utility functions for parsing and formatting Zoom meeting links for embedded in-app calls.
 */

export interface ParsedZoomMeeting {
  isZoom: boolean;
  meetingId: string;
  formattedMeetingId: string;
  passcode: string;
  webClientUrl: string;
  nativeAppUrl: string;
  originalUrl: string;
}

/**
 * Extracts Meeting ID and Passcode from a Zoom URL and generates
 * the official Zoom Web Client join URL for iframe embedding.
 */
export function parseZoomMeeting(url: string | null | undefined, userName = 'Participant'): ParsedZoomMeeting {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl) {
    return {
      isZoom: false,
      meetingId: '',
      formattedMeetingId: '',
      passcode: '',
      webClientUrl: '',
      nativeAppUrl: '',
      originalUrl: ''
    };
  }

  const isZoom = /zoom\.us/i.test(cleanUrl) || /zoom/i.test(cleanUrl);
  let meetingId = '';
  let passcode = '';

  try {
    // 1. Check path-based meeting ID: /j/1234567890 or /wc/1234567890 or /wc/join/1234567890
    const pathMatch = cleanUrl.match(/(?:\/j\/|\/wc\/|\/wc\/join\/|\/my\/)([0-9]{9,11})/i);
    if (pathMatch && pathMatch[1]) {
      meetingId = pathMatch[1];
    }

    // 2. Check query params ?confno= or ?meetingId= or &mid=
    const parsedUrl = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
    if (!meetingId) {
      meetingId = parsedUrl.searchParams.get('confno') 
        || parsedUrl.searchParams.get('meetingId') 
        || parsedUrl.searchParams.get('mid') 
        || '';
    }

    // 3. Extract passcode from query parameter ?pwd= or ?passcode=
    passcode = parsedUrl.searchParams.get('pwd') 
      || parsedUrl.searchParams.get('passcode') 
      || '';
  } catch {
    // Fallback regex in case URL parsing fails
    const matchId = cleanUrl.match(/(?:confno=|\/j\/|\/wc\/)([0-9]{9,11})/i);
    if (matchId) meetingId = matchId[1];

    const matchPwd = cleanUrl.match(/[?&]pwd=([^&#\s]+)/i);
    if (matchPwd) passcode = matchPwd[1];
  }

  // Format meeting ID with clean spacing for display (e.g., 812 3456 7890)
  let formattedMeetingId = meetingId;
  if (meetingId.length === 10) {
    formattedMeetingId = `${meetingId.slice(0, 3)} ${meetingId.slice(3, 6)} ${meetingId.slice(6)}`;
  } else if (meetingId.length === 11) {
    formattedMeetingId = `${meetingId.slice(0, 3)} ${meetingId.slice(3, 7)} ${meetingId.slice(7)}`;
  }

  const encodedName = encodeURIComponent(userName.trim() || 'Participant');
  const pwdParam = passcode ? `&pwd=${encodeURIComponent(passcode)}` : '';

  // Official Zoom Web Client join URL
  let webClientUrl = '';
  if (meetingId) {
    // prefer=1 forces the in-browser Zoom Web Client experience rather than prompt for desktop app
    webClientUrl = `https://app.zoom.us/wc/${meetingId}/join?prefer=1${pwdParam}&uname=${encodedName}`;
  } else if (isZoom) {
    webClientUrl = cleanUrl;
  }

  // Native Zoom desktop app deep-link protocol
  const nativeAppUrl = meetingId
    ? `zoommtg://zoom.us/join?confno=${meetingId}${pwdParam}&uname=${encodedName}`
    : cleanUrl;

  return {
    isZoom,
    meetingId,
    formattedMeetingId,
    passcode,
    webClientUrl,
    nativeAppUrl,
    originalUrl: cleanUrl
  };
}
