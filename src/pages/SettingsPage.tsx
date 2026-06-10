import { useState } from 'react'
import { useBaby } from '../hooks/useBaby'
import { useMedications } from '../hooks/useEvents'
import { saveBaby, addMedication, deleteMedication, exportAll, importAll } from '../db/storage'
import { serializeBackup, parseBackup } from '../lib/backup'
import { eventColor, palette } from '../lib/theme'
import type { MedicationUnit } from '../db/schema'

const UNITS: MedicationUnit[] = ['ml', 'mg', 'IU', 'drops']
const field = 'w-full rounded-2xl border border-faint bg-cream p-3 text-ink placeholder:text-inkSoft'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-md">
      <h2 className="mb-3 text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
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
    </div>
  )
}
