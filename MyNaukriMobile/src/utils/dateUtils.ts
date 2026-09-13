/**
 * Utility functions for consistent date and time formatting across the mobile app.
 * All dates and times are strictly formatted in Indian Standard Time (IST, UTC+05:30) as dd-MM-yyyy.
 */

export function formatDate(dateInput: string | number | Date | null | undefined, fallback = '-'): string {
  if (!dateInput) return fallback;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const parts = formatter.formatToParts(d);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';

    return `${day}-${month}-${year}`;
  } catch {
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istDate = new Date(utcTime + (330 * 60000));
    const day = String(istDate.getDate()).padStart(2, '0');
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const year = istDate.getFullYear();
    return `${day}-${month}-${year}`;
  }
}

export function formatDateTime(
  dateInput: string | number | Date | null | undefined, 
  fallback = '-', 
  includeTime = true
): string {
  if (!dateInput) return fallback;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;

  if (!includeTime) {
    return formatDate(d, fallback);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const parts = formatter.formatToParts(d);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '';
    const minute = parts.find(p => p.type === 'minute')?.value || '';
    const rawPeriod = parts.find(p => p.type === 'dayPeriod')?.value || 'AM';
    const dayPeriod = rawPeriod.toUpperCase().replace(/\./g, '').trim();

    return `${day}-${month}-${year}, ${hour}:${minute} ${dayPeriod} IST`;
  } catch {
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istDate = new Date(utcTime + (330 * 60000));
    const day = String(istDate.getDate()).padStart(2, '0');
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const year = istDate.getFullYear();
    let hours = istDate.getHours();
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${day}-${month}-${year}, ${strHours}:${minutes} ${ampm} IST`;
  }
}
