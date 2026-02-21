'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Download, Upload, Trash2, AlertCircle, CheckCircle2, LogOut, Chrome, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function SettingsPage() {
  const [testCount, setTestCount] = useState(0)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

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

    // Export both test records and their analysis data
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      testRecords: recordsArray,
      analysisData: {} as { [key: string]: any }
    }

    // Collect all analysis data for each test
    recordsArray.forEach((record: any) => {
      const analysis = localStorage.getItem(`analysis-${record.id}`)
      if (analysis) {
        exportData.analysisData[record.id] = JSON.parse(analysis)
      }
    })

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `test-analyzer-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Data exported successfully!')
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importedData = JSON.parse(content)

        let testRecordsToImport: any[] = []
        let analysisDataToImport: { [key: string]: any } = {}

        // Handle both old format (array) and new format (object with testRecords and analysisData)
        if (Array.isArray(importedData)) {
          // Old format - just test records array
          testRecordsToImport = importedData
        } else if (importedData.testRecords && Array.isArray(importedData.testRecords)) {
          // New format - object with testRecords and analysisData
          testRecordsToImport = importedData.testRecords
          analysisDataToImport = importedData.analysisData || {}
        } else {
          throw new Error('Invalid data format')
        }

        // Validate test records
        const isValid = testRecordsToImport.every((record: any) =>
          record.markedAnswers &&
          record.correctAnswers &&
          typeof record.totalMarks === 'number' &&
          typeof record.percentage === 'number'
        )

        if (!isValid) {
          throw new Error('Invalid data structure')
        }

        // Import test records
        const existingRecords = JSON.parse(localStorage.getItem('testRecords') || '[]')
        const mergedRecords = [...testRecordsToImport, ...existingRecords]
        const uniqueRecords = Array.from(
          new Map(mergedRecords.map((r: any) => [r.id, r])).values()
        )
        localStorage.setItem('testRecords', JSON.stringify(uniqueRecords))

        // Import analysis data
        Object.keys(analysisDataToImport).forEach((testId) => {
          localStorage.setItem(`analysis-${testId}`, JSON.stringify(analysisDataToImport[testId]))
        })

        setTestCount(uniqueRecords.length)
        toast.success(`Imported ${testRecordsToImport.length} test record(s) successfully!`)
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
      setTestCount(0)
      setClearing(false)
      toast.success('All test records cleared successfully!')
    }
  }

  const handleGoogleLogin = () => {
    toast.info('Google Login integration will be implemented soon!')
  }

  const handleGoogleLogout = () => {
    toast.info('Google Logout will be implemented soon!')
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
          {/* Data Management */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
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

          {/* Cloud Sync */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Chrome className="w-5 h-5 text-blue-500" />
                <CardTitle>Cloud Sync</CardTitle>
              </div>
              <CardDescription>
                Sync your data with Google Sheets for backup across devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-2">
                <Chrome className="h-4 w-4" />
                <AlertTitle>Google Sheets Integration</AlertTitle>
                <AlertDescription className="mt-3">
                  <p className="text-sm mb-4 leading-relaxed">
                    Connect your Google account to automatically backup your test records to Google Sheets.
                    Your data will be accessible from any device.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleGoogleLogin}
                      variant="default"
                      className="flex-1 h-11 text-base font-medium hover:scale-105 transition-transform duration-200 active:scale-95 shadow-md hover:shadow-lg"
                    >
                      <Chrome className="w-4 h-4 mr-2" />
                      Connect Google Account
                    </Button>
                    <Button
                      onClick={handleGoogleLogout}
                      variant="outline"
                      className="flex-1 h-11 text-base font-medium hover:scale-105 transition-transform duration-200 active:scale-95 hover:border-primary/50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Disconnect
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
                <span className="text-sm font-medium">Test Analyzer v1.0.0</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm">Supports 180 questions across 4 subjects</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm">Local storage with export/import options</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm">Detailed performance analysis</span>
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
          Test Analyzer - Settings
        </div>
      </footer>
    </div>
  )
}
