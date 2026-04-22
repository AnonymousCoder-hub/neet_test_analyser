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

// ===== BACKUP SYSTEM =====
const BACKUP_KEY = 'neet-backups'
const MAX_BACKUPS = 5

export interface BackupEntry {
  id: string
  timestamp: string
  recordCount: number
  data: any[] // the testRecords array snapshot
}

export function getBackups(): BackupEntry[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function createBackup(): BackupEntry {
  const currentData = JSON.parse(localStorage.getItem('testRecords') || '[]')
  const backup: BackupEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    recordCount: currentData.length,
    data: currentData,
  }

  const backups = getBackups()
  backups.unshift(backup) // newest first
  
  // Keep only last MAX_BACKUPS
  while (backups.length > MAX_BACKUPS) {
    backups.pop()
  }
  
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups))
  return backup
}

export function restoreBackup(backupId: string): boolean {
  try {
    const backups = getBackups()
    const backup = backups.find(b => b.id === backupId)
    if (!backup) return false

    // Save current state as a backup before restoring (so user can undo the restore)
    // But only if the current data is different from what we're restoring
    const currentData = JSON.parse(localStorage.getItem('testRecords') || '[]')
    if (currentData.length > 0) {
      createBackup() // auto-backup current state before restore
    }

    localStorage.setItem('testRecords', JSON.stringify(backup.data))
    
    // Clear stale analysis cache
    backup.data.forEach((r: any) => {
      localStorage.removeItem(`analysis-${r.id}`)
    })
    
    return true
  } catch {
    return false
  }
}

export function deleteBackup(backupId: string): void {
  const backups = getBackups().filter(b => b.id !== backupId)
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups))
}

// ===== SYNC FUNCTIONS =====

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

// Helper: pull cloud records and MERGE with local (local wins on duplicate ID to preserve local changes)
export async function pullFromCloud(token: string): Promise<{ success: boolean; cloudCount: number; localCount: number; totalCount: number; newFromCloud: number }> {
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

      // Merge: local first (takes priority on same ID to preserve local changes), then cloud-only records
      const merged = [...localRecords, ...cloudRecords]
      const unique = Array.from(new Map(merged.map((r: any) => [r.id, r])).values())
      
      // Count how many new records came from cloud
      const localIds = new Set(localRecords.map((r: any) => r.id))
      const newFromCloud = cloudRecords.filter((r: any) => !localIds.has(r.id)).length
      
      localStorage.setItem('testRecords', JSON.stringify(unique))

      return { success: true, cloudCount, localCount, totalCount: unique.length, newFromCloud }
    }
    return { success: false, cloudCount: 0, localCount: 0, totalCount: 0, newFromCloud: 0 }
  } catch {
    return { success: false, cloudCount: 0, localCount: 0, totalCount: 0, newFromCloud: 0 }
  }
}

// Helper: merge local + cloud data properly (local wins on conflict)
// Used on login to ensure no data loss
export async function mergeLocalAndCloud(token: string): Promise<{ success: boolean; localCount: number; cloudCount: number; totalCount: number; newFromCloud: number }> {
  try {
    // Step 1: Get cloud records
    const res = await fetch('/api/test-records', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()

    if (!res.ok || !data.records) {
      return { success: false, localCount: 0, cloudCount: 0, totalCount: 0, newFromCloud: 0 }
    }

    const localRecords: any[] = JSON.parse(localStorage.getItem('testRecords') || '[]')
    const localCount = localRecords.length
    const cloudRecords: any[] = data.records.map((r: any) => recalculateRecord(r))
    const cloudCount = cloudRecords.length

    // Merge: local first (preserves local versions on conflict), then add cloud-only records
    const merged = [...localRecords, ...cloudRecords]
    const unique = Array.from(new Map(merged.map((r: any) => [r.id, r])).values())
    
    const localIds = new Set(localRecords.map((r: any) => r.id))
    const newFromCloud = cloudRecords.filter((r: any) => !localIds.has(r.id)).length

    // Save merged result locally
    localStorage.setItem('testRecords', JSON.stringify(unique))

    // Step 2: Push merged result to cloud (so cloud also has the full merged set)
    await fetch('/api/test-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ records: unique, fullSync: true }),
    })

    return { success: true, localCount, cloudCount, totalCount: unique.length, newFromCloud }
  } catch {
    return { success: false, localCount: 0, cloudCount: 0, totalCount: 0, newFromCloud: 0 }
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

// Helper: check if user has data in cloud
export async function hasCloudData(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/test-records', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()
    return res.ok && data.records && data.records.length > 0
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
      pulledCount: pullResult.newFromCloud,
      totalCount: pullResult.totalCount,
    }
  } catch {
    return { success: false, pushedCount: 0, pulledCount: 0, totalCount: 0 }
  }
}
