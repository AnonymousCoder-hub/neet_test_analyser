'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Settings, History, Award, Calendar, TrendingUp, BookOpen, Trash2, Edit2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

interface TestRecord {
  id: string
  testName: string
  testDate: string
  totalMarks: number
  maxMarks: number
  percentage: number
  physicsMarks: number
  chemistryMarks: number
  botanyMarks: number
  zoologyMarks: number
  createdAt: string
}

export default function Home() {
  const [testRecords, setTestRecords] = useState<TestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const localRecords = localStorage.getItem('testRecords')
    if (localRecords) {
      setTestRecords(JSON.parse(localRecords))
    }
    setLoading(false)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getMarksColor = (marks: number, max: number) => {
    const percentage = (marks / max) * 100
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const bestScore = testRecords.length > 0 ? Math.max(...testRecords.map(r => r.totalMarks)) : 0
  const averageScore = testRecords.length > 0
    ? Math.round(testRecords.reduce((sum, r) => sum + r.totalMarks, 0) / testRecords.length)
    : 0

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this test?')) {
      const updatedRecords = testRecords.filter(r => r.id !== id)
      setTestRecords(updatedRecords)
      localStorage.setItem('testRecords', JSON.stringify(updatedRecords))
    }
  }

  const handleCardClick = (id: string) => {
    router.push(`/results/${id}`)
  }

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    router.push(`/edit/${id}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              NEET Test Analyzer
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent hover:scale-110 active:scale-95 transition-all duration-200 rounded-full"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Stats Overview */}
        {testRecords.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-8">
            <div className="group rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-200 p-2.5 flex items-center justify-between cursor-default">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{testRecords.length}</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">Total Tests</span>
              </div>
            </div>
            <div className="group rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-200 p-2.5 flex items-center justify-between cursor-default">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center`}>
                  <span className={`text-lg font-bold ${getMarksColor(averageScore, 720)}`}>
                    {averageScore}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">Avg Score</span>
              </div>
            </div>
            <div className="group rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-200 p-2.5 flex items-center justify-between cursor-default">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <span className={`text-lg font-bold ${getMarksColor(bestScore, 720)}`}>
                    {bestScore}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">Best Score</span>
              </div>
            </div>
            <div className="group rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-200 p-2.5 flex items-center justify-between cursor-default">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <span className={`text-lg font-bold ${getMarksColor(testRecords[0]?.totalMarks || 0, 720)}`}>
                    {testRecords[0]?.totalMarks || 0}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">Latest</span>
              </div>
            </div>
          </div>
        )}

        {/* Test History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Test History</h2>
            </div>
            {testRecords.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {testRecords.length} test{testRecords.length !== 1 ? 's' : ''} recorded
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : testRecords.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg text-muted-foreground mb-2">No tests recorded yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Start by analyzing your first NEET test
              </p>
              <Link href="/analyze">
                <Button className="hover:scale-105 transition-transform duration-200 active:scale-95 shadow-md hover:shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Analyze Your First Test
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleCardClick(record.id)}
                  className="group relative rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-150 hover:-translate-y-0.5 active:scale-95 cursor-pointer overflow-hidden"
                >
                  {/* Delete Button - Top Right Corner */}
                  <button
                    onClick={(e) => handleDelete(e, record.id)}
                    className="absolute top-2 right-2 z-10 text-muted-foreground hover:text-red-500 transition-colors duration-200"
                    title="Delete test"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Header with test name and score */}
                  <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border group-hover:from-primary/10 group-hover:to-primary/20 transition-colors pr-12">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                          {record.testName}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(record.createdAt)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-xl font-bold ${getMarksColor(record.totalMarks, record.maxMarks)}`}>
                          {record.totalMarks}
                        </div>
                        <div className="text-[10px] text-muted-foreground">/ 720</div>
                      </div>
                    </div>
                  </div>

                  {/* Subject-wise marks */}
                  <div className="p-3 grid grid-cols-2 gap-2 relative">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-xs font-medium text-muted-foreground">Phy</span>
                      </div>
                      <span className={`text-xs font-bold ${getMarksColor(record.physicsMarks, 180)}`}>
                        {record.physicsMarks}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-xs font-medium text-muted-foreground">Chem</span>
                      </div>
                      <span className={`text-xs font-bold ${getMarksColor(record.chemistryMarks, 180)}`}>
                        {record.chemistryMarks}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium text-muted-foreground">Bot</span>
                      </div>
                      <span className={`text-xs font-bold ${getMarksColor(record.botanyMarks, 180)}`}>
                        {record.botanyMarks}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span className="text-xs font-medium text-muted-foreground">Zoo</span>
                      </div>
                      <span className={`text-xs font-bold ${getMarksColor(record.zoologyMarks, 180)}`}>
                        {record.zoologyMarks}
                      </span>
                    </div>

                    {/* Edit Button - Bottom Right Corner */}
                    <button
                      onClick={(e) => handleEdit(e, record.id)}
                      className="absolute bottom-2 right-2 z-10 text-muted-foreground hover:text-primary transition-colors duration-200"
                      title="Edit answer key"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50">
        <div className="flex items-center gap-2 sm:justify-end bg-card/95 backdrop-blur-sm border-2 border-border rounded-full p-2 shadow-xl">
          <Link href="/analyze" className="flex-1 sm:flex-none">
            <Button
              size="sm"
              className="w-full sm:w-auto rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 active:scale-95 bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Test Analysis</span>
              <span className="sm:hidden">New Test</span>
            </Button>
          </Link>
          <Button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            size="icon"
            variant="outline"
            className="rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 active:scale-95 bg-background flex-shrink-0"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto pb-20">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          NEET Test Analyzer - Track Your Performance
        </div>
      </footer>
    </div>
  )
}
