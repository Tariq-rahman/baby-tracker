// Pure display formatters shared across the UI. No React, no DOM.

/** Relative time like 'just now', '15m ago', '2h ago', '2h 25m ago'. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h ago` : `${h}h ${m}m ago`
}

/** Coarse baby age from an ISO date-of-birth: days, then weeks, then months. */
export function ageLabel(dob: string, now: Date = new Date()): string {
  const birth = new Date(dob + 'T00:00:00')
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.floor((today.getTime() - birth.getTime()) / 86400000)

  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`
  if (days < 56) return `${Math.floor(days / 7)} weeks`

  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
  if (today.getDate() < birth.getDate()) months -= 1
  return `${months} ${months === 1 ? 'month' : 'months'}`
}

/** 12-hour clock parts for a date: { time: 'H:MM', ampm: 'AM' | 'PM' }. */
export function fmtClock(date: Date): { time: string; ampm: 'AM' | 'PM' } {
  let h = date.getHours()
  const m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return { time: `${h}:${String(m).padStart(2, '0')}`, ampm }
}
