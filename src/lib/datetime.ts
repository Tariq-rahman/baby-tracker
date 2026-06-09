function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Current local time formatted for an <input type="datetime-local">. */
export function nowLocalInput(): string {
  return isoToLocalInput(new Date().toISOString())
}

/** Convert a stored ISO datetime to the local 'YYYY-MM-DDTHH:mm' input format. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convert a local 'YYYY-MM-DDTHH:mm' input value back to an ISO string. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}
