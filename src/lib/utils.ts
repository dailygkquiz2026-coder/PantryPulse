import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Firestore rules require full ISO datetime (YYYY-MM-DDTHH:MM:SS...Z).
// HTML `<input type="date">` and the AI predictor return "YYYY-MM-DD".
// Normalize to ISO so the create/update passes security rules.
export function toIsoDateString(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  if (value.includes('T')) return value;
  const d = new Date(`${value}T00:00:00Z`);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
