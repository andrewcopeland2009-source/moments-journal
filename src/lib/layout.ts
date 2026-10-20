// Shared-element identifiers. A prefix keeps ids unique per screen so the
// same memory can appear on Today, the Timeline and the Calendar.
export const cardLayout = (prefix: string, date: string) => `${prefix}:card:${date}`;
export const photoLayout = (prefix: string, id: string) => `${prefix}:photo:${id}`;
export const CAPTURE_LAYOUT = 'today:capture';
