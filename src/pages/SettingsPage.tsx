import { useState } from 'react'
import { useBaby } from '../hooks/useBaby'
import { useMedications } from '../hooks/useEvents'
import {
  saveBaby,
  addMedication,
  deleteMedication,
} from '../db/storage'
import type { MedicationUnit } from '../db/schema'

const UNITS: MedicationUnit[] = ['ml', 'mg', 'IU', 'drops']

export default function SettingsPage() {
  const baby = useBaby()
  const medications = useMedications()

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [medName, setMedName] = useState('')
  const [medDose, setMedDose] = useState('')
  const [medUnit, setMedUnit] = useState<MedicationUnit>('IU')

  return (
    <div className="space-y-8 p-4">
      <section>
        <h2 className="mb-2 text-lg font-bold">Baby</h2>
        <p className="mb-2 text-sm text-slate-500">
          Current: {baby ? `${baby.name} (born ${baby.dateOfBirth})` : 'not set'}
        </p>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-2 w-full rounded border p-3"
        />
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="mb-2 w-full rounded border p-3"
        />
        <button
          onClick={() => name && dob && saveBaby({ name, dateOfBirth: dob })}
          className="w-full rounded bg-blue-600 p-3 font-bold text-white"
        >
          Save baby
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Medications</h2>
        <ul className="mb-3 divide-y">
          {medications.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <span>
                {m.name} — {m.defaultDose} {m.unit}
              </span>
              <button
                onClick={() => m.id && deleteMedication(m.id)}
                className="text-sm text-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <input
          placeholder="Name (e.g. Vitamin D)"
          value={medName}
          onChange={(e) => setMedName(e.target.value)}
          className="mb-2 w-full rounded border p-3"
        />
        <div className="mb-2 flex gap-2">
          <input
            type="number"
            placeholder="Default dose"
            value={medDose}
            onChange={(e) => setMedDose(e.target.value)}
            className="flex-1 rounded border p-3"
          />
          <select
            value={medUnit}
            onChange={(e) => setMedUnit(e.target.value as MedicationUnit)}
            className="rounded border p-3"
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
          className="w-full rounded bg-emerald-600 p-3 font-bold text-white"
        >
          Add medication
        </button>
      </section>
    </div>
  )
}
