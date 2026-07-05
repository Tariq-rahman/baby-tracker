import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBaby, useEnabledEventTypes } from '../hooks/useBaby'
import { useMedications } from '../hooks/useEvents'
import {
  saveBaby,
  addMedication,
  deleteMedication,
  setEnabledEventTypes,
  exportAll,
  importAll,
} from '../db/storage'
import { serializeBackup, parseBackup } from '../lib/backup'
import { signOut } from '../lib/auth'
import { createInvite, acceptInvite, buildInviteLink, parseInviteCode } from '../lib/invites'
import {
  isPushSupported,
  getReminderState,
  enableReminders,
  disableReminders,
  setReminderInterval,
  DEFAULT_INTERVAL_MINUTES,
} from '../lib/push'
import { eventColor, eventLabel, palette } from '../lib/theme'
import type { EventType, MedicationUnit } from '../db/schema'

const UNITS: MedicationUnit[] = ['ml', 'mg', 'IU', 'drops']

// Types with a quick-log button on the home screen. Weight is tracked from its own
// page, so it isn't toggled here; setEnabledEventTypes preserves it regardless.
const TOGGLEABLE_TYPES: EventType[] = ['feed', 'nappy', 'dose', 'sleep']

function TrackingCard() {
  const enabled = useEnabledEventTypes()
  const toggle = (t: EventType, on: boolean) => {
    const next = on ? [...enabled.filter((x) => x !== t), t] : enabled.filter((x) => x !== t)
    void setEnabledEventTypes(next)
  }
  return (
    <Card title="Tracking">
      <p className="mb-3 text-sm text-inkSoft">
        Choose what to track. Turning something off hides its log button — your past entries stay.
      </p>
      <ul className="divide-y divide-faint">
        {TOGGLEABLE_TYPES.map((t) => (
          <li key={t} className="flex items-center justify-between py-2.5">
            <span className="font-medium text-ink">{eventLabel[t]}</span>
            <input
              type="checkbox"
              aria-label={eventLabel[t]}
              checked={enabled.includes(t)}
              onChange={(e) => toggle(t, e.target.checked)}
              className="h-5 w-5 accent-ring"
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}
const field = 'w-full rounded-2xl border border-faint bg-cream p-3 text-ink placeholder:text-inkSoft'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-md">
      <h2 className="mb-3 text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

function SharingCard() {
  const [params] = useSearchParams()
  const [code, setCode] = useState('')
  const [link, setLink] = useState('')
  // Deep link `/settings?invite=CODE` prefills the join field at mount.
  const [joinCode, setJoinCode] = useState(() => parseInviteCode(`?${params.toString()}`) ?? '')
  const [busy, setBusy] = useState(false)

  const invite = async () => {
    setBusy(true)
    try {
      const c = await createInvite()
      setCode(c)
      setLink(buildInviteLink(c, window.location.origin))
    } catch (err) {
      alert(`Could not create an invite: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const join = async () => {
    if (!joinCode.trim()) return
    if (!confirm('Joining will REPLACE the data on this device with the shared household. Continue?'))
      return
    setBusy(true)
    try {
      const { householdName } = await acceptInvite(joinCode)
      alert(`Joined ${householdName}. Reloading with the shared data…`)
      window.location.assign('/')
    } catch (err) {
      alert(`Could not join: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Sharing">
      <p className="mb-3 text-sm text-inkSoft">
        Invite another caregiver to share this baby, or join a household you were invited to.
      </p>

      <button
        onClick={invite}
        disabled={busy}
        className="press mb-3 w-full rounded-2xl py-3 font-bold text-white disabled:opacity-50"
        style={{ background: palette.ring }}
      >
        Invite a caregiver
      </button>

      {code && (
        <div className="mb-4 rounded-2xl border border-faint bg-cream p-3">
          <p className="mb-1 text-sm text-inkSoft">Share this code (valid 7 days, one use):</p>
          <p className="mb-2 select-all font-mono text-2xl font-bold tracking-widest text-ink">{code}</p>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(link)
              alert('Invite link copied.')
            }}
            className="press w-full rounded-2xl border border-faint py-2.5 text-sm font-semibold text-ink"
          >
            Copy invite link
          </button>
        </div>
      )}

      <label className="mb-1 block text-sm font-medium text-inkSoft">Have a code?</label>
      <input
        placeholder="Invite code"
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value)}
        className={`${field} mb-2 font-mono uppercase tracking-widest`}
      />
      <button
        onClick={join}
        disabled={busy || !joinCode.trim()}
        className="press w-full rounded-2xl py-3 font-bold text-white disabled:opacity-50"
        style={{ background: palette.ink }}
      >
        Join household
      </button>
    </Card>
  )
}

const INTERVAL_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 120, label: '2 hours' },
  { minutes: 150, label: '2.5 hours' },
  { minutes: 180, label: '3 hours' },
  { minutes: 210, label: '3.5 hours' },
  { minutes: 240, label: '4 hours' },
]

function RemindersCard() {
  const supported = isPushSupported()
  const [enabled, setEnabled] = useState(false)
  const [intervalMinutes, setIntervalMinutes] = useState(DEFAULT_INTERVAL_MINUTES)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supported) return
    void getReminderState().then((s) => {
      setEnabled(s.enabled)
      setIntervalMinutes(s.intervalMinutes)
    })
  }, [supported])

  const toggle = async () => {
    setBusy(true)
    try {
      if (enabled) {
        await disableReminders()
        setEnabled(false)
      } else {
        await enableReminders(intervalMinutes)
        setEnabled(true)
      }
    } catch (err) {
      alert(`Could not update reminders: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const changeInterval = async (minutes: number) => {
    setIntervalMinutes(minutes)
    if (!enabled) return
    try {
      await setReminderInterval(minutes)
    } catch (err) {
      alert(`Could not update the reminder interval: ${(err as Error).message}`)
    }
  }

  return (
    <Card title="Feed reminders">
      {!supported ? (
        <p className="text-sm text-inkSoft">
          This device doesn’t support push notifications. Install the app to your home screen and
          try again.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-inkSoft">
            Get a nudge when it’s been a while since the last bottle. Reminders are sent from the
            cloud, so they arrive even with the app closed.
          </p>

          <label className="mb-1 block text-sm font-medium text-inkSoft">Remind me after</label>
          <select
            value={intervalMinutes}
            onChange={(e) => void changeInterval(Number(e.target.value))}
            className={`${field} mb-3`}
          >
            {INTERVAL_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            onClick={toggle}
            disabled={busy}
            className="press w-full rounded-2xl py-3 font-bold text-white disabled:opacity-50"
            style={{ background: enabled ? palette.ink : palette.ring }}
          >
            {enabled ? 'Turn off reminders' : 'Turn on reminders'}
          </button>
        </>
      )}
    </Card>
  )
}

export default function SettingsPage() {
  const baby = useBaby()
  const medications = useMedications()

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [medName, setMedName] = useState('')
  const [medDose, setMedDose] = useState('')
  const [medUnit, setMedUnit] = useState<MedicationUnit>('IU')

  return (
    <div className="space-y-5 px-5 pt-3">
      <h1 className="text-xl font-bold text-ink">Settings</h1>

      <Card title="Baby">
        <p className="mb-3 text-sm text-inkSoft">
          Current: {baby ? `${baby.name} (born ${baby.dateOfBirth})` : 'not set'}
        </p>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${field} mb-2`}
        />
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className={`${field} mb-3`}
        />
        <button
          onClick={() => name && dob && saveBaby({ name, dateOfBirth: dob })}
          className="press w-full rounded-2xl py-3 font-bold text-white"
          style={{ background: palette.ring }}
        >
          Save baby
        </button>
      </Card>

      <TrackingCard />

      <Card title="Medications">
        <ul className="mb-3 divide-y divide-faint">
          {medications.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2.5">
              <span className="text-ink">
                {m.name} — {m.defaultDose} {m.unit}
              </span>
              <button onClick={() => m.id && deleteMedication(m.id)} className="text-sm font-semibold text-red-600">
                Delete
              </button>
            </li>
          ))}
        </ul>
        <input
          placeholder="Name (e.g. Vitamin D)"
          value={medName}
          onChange={(e) => setMedName(e.target.value)}
          className={`${field} mb-2`}
        />
        <div className="mb-3 flex gap-2">
          <input
            type="number"
            placeholder="Default dose"
            value={medDose}
            onChange={(e) => setMedDose(e.target.value)}
            className={`${field} flex-1`}
          />
          <select
            value={medUnit}
            onChange={(e) => setMedUnit(e.target.value as MedicationUnit)}
            className="rounded-2xl border border-faint bg-cream p-3 text-ink"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            if (!medName || !medDose) return
            addMedication({ name: medName, defaultDose: Number(medDose), unit: medUnit })
            setMedName('')
            setMedDose('')
          }}
          className="press w-full rounded-2xl py-3 font-bold text-white"
          style={{ background: eventColor.dose }}
        >
          Add medication
        </button>
      </Card>

      <Card title="Backup">
        <button
          onClick={async () => {
            const data = await exportAll()
            const json = serializeBackup(data)
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `baby-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="press mb-3 w-full rounded-2xl py-3 font-bold text-white"
          style={{ background: palette.ink }}
        >
          Export JSON
        </button>
        <label className="block w-full rounded-2xl border-2 border-dashed border-faint p-3 text-center font-medium text-inkSoft">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const text = await file.text()
                const data = parseBackup(text)
                if (!confirm('Importing will REPLACE all current data. Continue?')) return
                await importAll(data)
                alert('Import complete.')
              } catch (err) {
                alert(`Import failed: ${(err as Error).message}`)
              }
            }}
          />
        </label>
      </Card>

      <SharingCard />

      <RemindersCard />

      <Card title="Account">
        <button
          onClick={() => signOut()}
          className="press w-full rounded-2xl border border-faint py-3 font-bold text-ink"
        >
          Sign out
        </button>
      </Card>
    </div>
  )
}
