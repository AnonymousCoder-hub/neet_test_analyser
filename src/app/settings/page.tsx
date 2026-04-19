'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, Download, Trash2, AlertCircle, CheckCircle2, Shield, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth, pushToCloud, fullSync } from '@/lib/auth-store'

export default function SettingsPage() {
  const [testCount, setTestCount] = useState(0)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, token, isAuthenticated } = useAuth()

  useEffect(() => {
    setMounted(true)
    loadTestCount()
  }, [])

  const loadTestCount = () => {
    const records = JSON.parse(localStorage.getItem('testRecords') || '[]')
    setTestCount(records.length)
  }

  const handleExport = () => {
    const records = localStorage.getItem('testRecords')
    if (!records) {
      toast.error('No data to export')
      return
    }

    const recordsArray = JSON.parse(records)

    // OPTIMIZED: Only export essential data - markedAnswers + correctAnswers
    // Everything else can be recalculated from these two strings
    const slimRecords = recordsArray.map((record: any) => ({
      id: record.id,
      n: record.testName, // shortened key
      m: record.markedAnswers, // marked answers (180 chars)
      c: record.correctAnswers, // correct answers (180 chars)
      s: record.selectedSubjects, // which subjects selected
      ts: record.timeSlipEnabled ? {
        e: 1,
        h: record.timeTaken?.hours ?? 0,
        mi: record.timeTaken?.minutes ?? 0,
        sm: record.timeSlipMinutes ?? 0,
      } : undefined,
      no: record.notes || undefined,
      d: record.createdAt, // date
    }))

    const exportData = {
      v: 2, // version 2 = optimized format
      e: new Date().toISOString().split('T')[0],
      r: slimRecords,
    }

    const dataStr = JSON.stringify(exportData) // No pretty printing - saves space
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `neet-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    const sizeKB = Math.round(dataBlob.size / 1024)
    toast.success(`Exported ${recordsArray.length} test(s) — ${sizeKB} KB`)
  }

  const recalculateRecord = (record: any) => {
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

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        const importedData = JSON.parse(content)

        let recordsToImport: any[] = []

        // Support v2 optimized format
        if (importedData.v === 2 && Array.isArray(importedData.r)) {
          recordsToImport = importedData.r.map((r: any) => ({
            id: r.id,
            testName: r.n || `Test ${r.id}`,
            markedAnswers: r.m,
            correctAnswers: r.c,
            selectedSubjects: r.s || { physics: true, chemistry: true, botany: true, zoology: true },
            timeSlipEnabled: r.ts?.e === 1,
            timeTaken: r.ts ? { hours: r.ts.h, minutes: r.ts.mi } : null,
            timeSlipMinutes: r.ts?.sm ?? null,
            notes: r.no || '',
            createdAt: r.d || new Date().toISOString(),
          }))
          // Recalculate computed fields
          recordsToImport = recordsToImport.map((record: any) => recalculateRecord(record))
        }
        // Support v1 format (original)
        else if (importedData.testRecords && Array.isArray(importedData.testRecords)) {
          recordsToImport = importedData.testRecords.map((r: any) => recalculateRecord(r))
        }
        // Support plain array
        else if (Array.isArray(importedData)) {
          recordsToImport = importedData.map((r: any) => recalculateRecord(r))
        } else {
          throw new Error('Invalid data format')
        }

        const isValid = recordsToImport.every((record: any) =>
          record.markedAnswers &&
          record.correctAnswers
        )

        if (!isValid) {
          throw new Error('Invalid data structure — missing markedAnswers or correctAnswers')
        }

        const existingRecords = JSON.parse(localStorage.getItem('testRecords') || '[]')
        const mergedRecords = [...recordsToImport, ...existingRecords]
        const uniqueRecords = Array.from(
          new Map(mergedRecords.map((r: any) => [r.id, r])).values()
        )
        localStorage.setItem('testRecords', JSON.stringify(uniqueRecords))

        // Clear stale analysis cache since we can regenerate from data
        uniqueRecords.forEach((r: any) => {
          localStorage.removeItem(`analysis-${r.id}`)
        })

        setTestCount(uniqueRecords.length)
        
        // Auto-push imported records to cloud if logged in
        if (isAuthenticated && token) {
          pushToCloud(token).catch(() => {})
        }
        
        toast.success(`Imported ${recordsToImport.length} test record(s)!`)
      } catch (error) {
        console.error('Import error:', error)
        toast.error('Failed to import data. Please check the file format.')
      } finally {
        setImporting(false)
        if (event.target) {
          event.target.value = ''
        }
      }
    }

    reader.readAsText(file)
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all test records? This action cannot be undone.')) {
      setClearing(true)
      localStorage.removeItem('testRecords')
      // Also clear all analysis cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('analysis-')) localStorage.removeItem(key)
      })
      setTestCount(0)
      setClearing(false)
      toast.success('All test records cleared!')
      
      // Also clear cloud data if logged in
      if (isAuthenticated && token) {
        // Push empty records to effectively clear cloud
        fetch('/api/test-records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ records: [] }),
        }).catch(() => {})
      }
    }
  }

  const handleFullSync = async () => {
    if (!isAuthenticated || !token) {
      toast.error('Please login to sync data')
      return
    }

    setSyncing(true)
    try {
      const result = await fullSync(token)
      loadTestCount()
      
      if (result.success) {
        toast.success(`Sync complete! Pushed: ${result.pushedCount}, Pulled: ${result.pulledCount}, Total: ${result.totalCount}`)
      } else {
        toast.error('Sync partially failed')
      }
    } catch {
      toast.error('Sync failed — network error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent hover:scale-110 transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-sm text-muted-foreground">Manage your data and preferences</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Cloud Sync */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-primary" />
                <CardTitle>Cloud Sync</CardTitle>
              </div>
              <CardDescription>
                {isAuthenticated
                  ? `Sync your data across devices (logged in as ${user?.username})`
                  : 'Login to sync your data across devices'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{user?.username}</div>
                      <div className="text-xs text-muted-foreground">Account connected</div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                  </div>
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-medium">
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Auto-sync enabled — your tests are automatically saved to cloud when you create, edit, or delete them</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleFullSync}
                    disabled={syncing}
                    className="w-full h-11"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Full Sync (Pull + Push)'}
                  </Button>
                </div>
              ) : (
                <Alert className="border-2">
                  <CloudOff className="h-4 w-4" />
                  <AlertTitle>Login Required</AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="text-sm mb-3">
                      Create an account or login to sync your test records to the cloud. Your data will be accessible from any device.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click the profile icon in the top-right corner to get started.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Data Management</CardTitle>
              </div>
              <CardDescription>
                Export your data for backup or import from a previous backup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/10">
                <div>
                  <div className="font-medium text-base">Total Test Records</div>
                  <div className="text-3xl font-bold text-primary mt-1">{testCount}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {testCount} test{testCount !== 1 ? 's' : ''} stored locally
                  </div>
                </div>
              </div>

              {/* FIXED: Download icon for Export, Upload icon for Import */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleExport}
                  disabled={testCount === 0}
                  className="flex-1 h-11 text-base font-medium hover:scale-105 transition-transform duration-200 active:scale-95 shadow-md hover:shadow-lg"
                  size="default"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <div className="flex-1">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    disabled={importing}
                    id="import-file"
                    className="hidden"
                  />
                  <label htmlFor="import-file" className="block h-full">
                    <Button
                      variant="outline"
                      disabled={importing}
                      className="w-full h-11 text-base font-medium cursor-pointer hover:scale-105 transition-transform duration-200 active:scale-95 hover:border-primary/50"
                      asChild
                    >
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {importing ? 'Importing...' : 'Import Data'}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              <Alert variant="destructive" className="border-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Danger Zone</AlertTitle>
                <AlertDescription className="mt-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span className="text-sm">Delete all test records permanently</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClearAll}
                      disabled={clearing || testCount === 0}
                      className="hover:bg-destructive/90 hover:scale-105 transition-transform duration-200 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {clearing ? 'Clearing...' : 'Clear All Data'}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Theme Preferences */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-base mb-1">Theme</div>
                  <div className="text-sm text-muted-foreground">
                    Current: {mounted ? (theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System') : 'Loading...'}
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant={mounted && theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className={`flex-1 sm:flex-none h-11 px-4 hover:scale-105 transition-transform duration-200 active:scale-95 ${
                      mounted && theme === 'light' ? 'shadow-md hover:shadow-lg' : 'hover:border-primary/50'
                    }`}
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </Button>
                  <Button
                    variant={mounted && theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className={`flex-1 sm:flex-none h-11 px-4 hover:scale-105 transition-transform duration-200 active:scale-95 ${
                      mounted && theme === 'dark' ? 'shadow-md hover:shadow-lg' : 'hover:border-primary/50'
                    }`}
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={mounted && theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                    className={`flex-1 sm:flex-none h-11 px-4 hover:scale-105 transition-transform duration-200 active:scale-95 ${
                      mounted && theme === 'system' ? 'shadow-md hover:shadow-lg' : 'hover:border-primary/50'
                    }`}
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <CardTitle>About</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm font-medium">NEET Test Analyzer v2.0.0</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm">Supports 180 questions across 4 subjects</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm">Cloud sync with secure authentication</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm">Optimized export format (minimal file size)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Theme Toggle Button */}
      <Button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        size="icon"
        className="fixed bottom-4 right-4 rounded-full shadow-lg hover:scale-110 transition-transform duration-200 active:scale-95"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          NEET Test Analyzer - Settings
        </div>
      </footer>
    </div>
  )
}
