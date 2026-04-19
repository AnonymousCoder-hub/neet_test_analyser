'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: { id: string; username: string; role: string } | null
  token: string | null
  isAuthenticated: boolean
  login: (user: { id: string; username: string; role: string }, token: string) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'neet-auth',
    }
  )
)

// Helper: recalculate computed fields from markedAnswers + correctAnswers
export function recalculateRecord(record: any) {
  const marked = (record.markedAnswers || '').replace(/\s/g, '').split('')
  const correct = (record.correctAnswers || '').replace(/\s/g, '').split('')
  const selectedSubjects = record.selectedSubjects || { physics: true, chemistry: true, botany: true, zoology: true }

  let totalCorrect = 0, totalWrong = 0, totalUnmarked = 0
  let pC = 0, pW = 0, cC = 0, cW = 0, bC = 0, bW = 0, zC = 0, zW = 0

  for (let i = 0; i < 180; i++) {
    const qNum = i + 1
    const subject = qNum <= 45 ? 'physics' : qNum <= 90 ? 'chemistry' : qNum <= 135 ? 'botany' : 'zoology'
    if (!selectedSubjects[subject]) continue

    const m = marked[i] || '0'
    const c = correct[i] || '0'
    const isUnmarked = m === '0'

    if (isUnmarked) {
      totalUnmarked++
    } else if (m === c) {
      totalCorrect++
      if (subject === 'physics') pC++; else if (subject === 'chemistry') cC++; else if (subject === 'botany') bC++; else zC++
    } else {
      totalWrong++
      if (subject === 'physics') pW++; else if (subject === 'chemistry') cW++; else if (subject === 'botany') bW++; else zW++
    }
  }

  const selectedCount = Object.values(selectedSubjects).filter(Boolean).length
  const maxMarks = selectedCount * 180
  const totalMarks = (totalCorrect * 4) - (totalWrong * 1)

  return {
    ...record,
    totalMarks,
    maxMarks,
    percentage: maxMarks > 0 ? parseFloat(((totalMarks / maxMarks) * 100).toFixed(2)) : 0,
    totalCorrect,
    totalWrong,
    totalUnmarked,
    physicsMarks: (pC * 4) - (pW * 1),
    chemistryMarks: (cC * 4) - (cW * 1),
    botanyMarks: (bC * 4) - (bW * 1),
    zoologyMarks: (zC * 4) - (zW * 1),
    markedAnswers: marked.join(''),
    correctAnswers: correct.join(''),
  }
}

// Helper: push ALL local test records to cloud (full sync)
// Uses fullSync=true so cloud matches local exactly (deletes records removed locally)
export async function pushToCloud(token: string): Promise<{ success: boolean; count: number }> {
  try {
    const records = JSON.parse(localStorage.getItem('testRecords') || '[]')
    if (records.length === 0) return { success: true, count: 0 }

    const res = await fetch('/api/test-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ records, fullSync: true }),
    })

    const data = await res.json()
    if (res.ok) {
      return { success: true, count: data.count || 0 }
    }
    return { success: false, count: 0 }
  } catch {
    return { success: false, count: 0 }
  }
}

// Helper: pull cloud records and merge with local
// Cloud records are kept for duplicates (same ID), local-only records are preserved
export async function pullFromCloud(token: string): Promise<{ success: boolean; cloudCount: number; localCount: number; totalCount: number }> {
  try {
    const res = await fetch('/api/test-records', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()

    if (res.ok && data.records) {
      const localRecords: any[] = JSON.parse(localStorage.getItem('testRecords') || '[]')
      const localCount = localRecords.length
      const cloudRecords: any[] = data.records.map((r: any) => recalculateRecord(r))
      const cloudCount = cloudRecords.length

      // Merge: cloud first (takes priority on same ID), then local-only records
      const merged = [...cloudRecords, ...localRecords]
      const unique = Array.from(new Map(merged.map((r: any) => [r.id, r])).values())
      localStorage.setItem('testRecords', JSON.stringify(unique))

      return { success: true, cloudCount, localCount, totalCount: unique.length }
    }
    return { success: false, cloudCount: 0, localCount: 0, totalCount: 0 }
  } catch {
    return { success: false, cloudCount: 0, localCount: 0, totalCount: 0 }
  }
}

// Helper: push a single test record to cloud (upsert only, NO deletion of other records)
export async function pushSingleRecord(token: string, record: any): Promise<boolean> {
  try {
    const res = await fetch('/api/test-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      // NO fullSync flag — this only upserts the single record without deleting others
      body: JSON.stringify({ records: [record] }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Helper: delete a single record from cloud
export async function deleteCloudRecord(token: string, recordId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/test-records', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ recordId }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Helper: full 2-way sync — push local to cloud, then pull cloud to local
export async function fullSync(token: string): Promise<{ success: boolean; pushedCount: number; pulledCount: number; totalCount: number }> {
  try {
    // Step 1: Push all local records to cloud (fullSync=true to match local state)
    const pushResult = await pushToCloud(token)
    
    // Step 2: Pull cloud records and merge
    const pullResult = await pullFromCloud(token)

    return {
      success: pushResult.success && pullResult.success,
      pushedCount: pushResult.count,
      pulledCount: pullResult.cloudCount,
      totalCount: pullResult.totalCount,
    }
  } catch {
    return { success: false, pushedCount: 0, pulledCount: 0, totalCount: 0 }
  }
}
