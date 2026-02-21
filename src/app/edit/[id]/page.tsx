'use client'

import { useState, useLayoutEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

export default function EditPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.id as string

  const [testData, setTestData] = useState({
    testName: '',
    omrMarkedAnswers: Array(180).fill('0'),
    correctAnswerString: ''
  })
  const [showOldNumbering, setShowOldNumbering] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useLayoutEffect(() => {
    const records = JSON.parse(localStorage.getItem('testRecords') || '[]')
    const test = records.find((r: any) => r.id === testId)

    if (test) {
      // Handle both array and string formats for marked answers
      let marked: string[]
      if (Array.isArray(test.markedAnswers)) {
        marked = test.markedAnswers
      } else {
        marked = test.markedAnswers?.replace(/\s/g, '').split('') || Array(180).fill('0')
      }
      // Correct answers are always stored as string
      const correct = test.correctAnswers?.replace(/\s/g, '') || ''
      requestAnimationFrame(() => {
        setTestData({
          testName: test.testName,
          omrMarkedAnswers: marked,
          correctAnswerString: correct
        })
        setLoading(false)
      })
    } else {
      requestAnimationFrame(() => setLoading(false))
    }
  }, [testId])

  const getDisplayQuestionNumber = (index: number): number => {
    if (!showOldNumbering) return index + 1
    if (index < 45) return index + 1
    if (index < 90) return index + 6
    if (index < 135) return index + 11
    return index + 16
  }

  const renderOMRRow = (index: number) => {
    const displayNumber = getDisplayQuestionNumber(index)
    return (
      <div key={index} className="flex items-center gap-3">
        <span className="w-8 text-xs font-medium text-muted-foreground text-right flex-shrink-0 pt-2">
          {displayNumber}
        </span>
        <div className="flex-1 flex border border-white/10 rounded-lg overflow-hidden bg-background shadow-sm">
          {['1', '2', '3', '4'].map((option) => (
            <button
              key={option}
              onClick={() => {
                const newAnswers = [...testData.omrMarkedAnswers]
                // Toggle selection
                if (newAnswers[index] === option) {
                  newAnswers[index] = '0' // Deselect
                } else {
                  newAnswers[index] = option // Select
                }
                setTestData({ ...testData, omrMarkedAnswers: newAnswers })
              }}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all duration-200 relative ${
                testData.omrMarkedAnswers[index] === option
                  ? 'bg-white text-black shadow-inner'
                  : 'text-muted-foreground/70 hover:bg-white/5 hover:text-foreground'
              }`}
            >
              {option}
              {option !== '4' && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-px bg-white/10" />
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const saveAndRecalculate = () => {
    const marked = testData.omrMarkedAnswers
    const correct = testData.correctAnswerString.replace(/\s/g, '').split('')

    setSaving(true)

    const getSubjectForQuestion = (qNum: number): string => {
      if (qNum <= 45) return 'Physics'
      if (qNum <= 90) return 'Chemistry'
      if (qNum <= 135) return 'Botany'
      return 'Zoology'
    }

    const questionResults: any[] = []
    const subjectWiseData: { [key: string]: any } = {
      'Physics': { name: 'Physics', correct: 0, wrong: 0, unmarked: 0, markedQuestions: [], wrongQuestions: [], unmarkedQuestions: [] },
      'Chemistry': { name: 'Chemistry', correct: 0, wrong: 0, unmarked: 0, markedQuestions: [], wrongQuestions: [], unmarkedQuestions: [] },
      'Botany': { name: 'Botany', correct: 0, wrong: 0, unmarked: 0, markedQuestions: [], wrongQuestions: [], unmarkedQuestions: [] },
      'Zoology': { name: 'Zoology', correct: 0, wrong: 0, unmarked: 0, markedQuestions: [], wrongQuestions: [], unmarkedQuestions: [] },
    }

    let totalCorrect = 0
    let totalWrong = 0
    let totalUnmarked = 0

    for (let i = 0; i < 180; i++) {
      const qNum = i + 1
      const markedAnswer = marked[i]
      const correctAnswer = correct[i]
      const subject = getSubjectForQuestion(qNum)
      const isUnmarked = markedAnswer === '0'
      const isCorrect = markedAnswer === correctAnswer && !isUnmarked

      questionResults.push({
        questionNumber: qNum,
        marked: markedAnswer,
        correct: correctAnswer,
        isCorrect,
        isUnmarked,
        subject,
      })

      if (isUnmarked) {
        subjectWiseData[subject].unmarkedQuestions.push(qNum)
        subjectWiseData[subject].unmarked++
        totalUnmarked++
      } else if (isCorrect) {
        subjectWiseData[subject].correct++
        subjectWiseData[subject].markedQuestions.push(qNum)
        totalCorrect++
      } else {
        subjectWiseData[subject].wrong++
        subjectWiseData[subject].markedQuestions.push(qNum)
        subjectWiseData[subject].wrongQuestions.push(qNum)
        totalWrong++
      }
    }

    const statsArray = Object.values(subjectWiseData)
    const totalMarks = (totalCorrect * 4) - (totalWrong * 1)

    const overall = {
      testName: testData.testName || `Test ${Date.now()}`,
      totalQuestions: 180,
      totalCorrect,
      totalWrong,
      totalUnmarked,
      totalMarks,
      maxMarks: 720,
      percentage: ((totalMarks / 720) * 100).toFixed(2),
      physicsMarks: (subjectWiseData['Physics'].correct * 4) - (subjectWiseData['Physics'].wrong * 1),
      chemistryMarks: (subjectWiseData['Chemistry'].correct * 4) - (subjectWiseData['Chemistry'].wrong * 1),
      botanyMarks: (subjectWiseData['Botany'].correct * 4) - (subjectWiseData['Botany'].wrong * 1),
      zoologyMarks: (subjectWiseData['Zoology'].correct * 4) - (subjectWiseData['Zoology'].wrong * 1),
      subjects: statsArray,
      questions: questionResults,
    }

    const record = {
      id: testId,
      testName: overall.testName,
      markedAnswers: marked.join(''),
      correctAnswers: testData.correctAnswerString.replace(/\s/g, ''),
      totalMarks: overall.totalMarks,
      maxMarks: 720,
      percentage: parseFloat(overall.percentage),
      totalCorrect,
      totalWrong,
      totalUnmarked,
      physicsMarks: overall.physicsMarks,
      chemistryMarks: overall.chemistryMarks,
      botanyMarks: overall.botanyMarks,
      zoologyMarks: overall.zoologyMarks,
      createdAt: new Date().toISOString(),
    }

    const records = JSON.parse(localStorage.getItem('testRecords') || '[]')
    const index = records.findIndex((r: any) => r.id === testId)
    if (index !== -1) {
      records[index] = record
      localStorage.setItem('testRecords', JSON.stringify(records))
    }

    localStorage.setItem(`analysis-${testId}`, JSON.stringify(overall))

    setSaving(false)
    router.push(`/results/${testId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-accent hover:scale-110 transition-all duration-200">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Edit Test
              </h1>
              <p className="text-sm text-muted-foreground">Edit your marked answers and correct answer key</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle>Edit: {testData.testName}</CardTitle>
            <CardDescription>
              Click to select/deselect options. Toggle "Old OMR Numbering" if using old OMR sheets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Name</label>
              <Input value={testData.testName} onChange={(e) => setTestData({ ...testData, testName: e.target.value })} className="text-base" />
            </div>

            <div className="flex items-center gap-2 py-2 border-b border-border">
              <input
                type="checkbox"
                id="old-numbering"
                checked={showOldNumbering}
                onChange={(e) => setShowOldNumbering(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary"
              />
              <label htmlFor="old-numbering" className="text-sm text-muted-foreground cursor-pointer">
                Old OMR Numbering (1-45, 51-95, 101-145, 151-195)
              </label>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-primary">Your Marked Answers</h3>
                  <span className="text-xs text-muted-foreground">
                    {testData.omrMarkedAnswers.filter(a => a !== '0').length} / 180 answered
                  </span>
                </div>
                <div className="space-y-4">
                  {['Physics', 'Chemistry', 'Botany', 'Zoology'].map((subject, idx) => {
                    const startIdx = idx * 45
                    const endIdx = startIdx + 45
                    const oldStart = idx === 0 ? 1 : idx === 1 ? 51 : idx === 2 ? 101 : 151
                    const oldEnd = oldStart + 44
                    return (
                      <div key={subject} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            subject === 'Physics' ? 'bg-blue-500' : subject === 'Chemistry' ? 'bg-green-500' : subject === 'Botany' ? 'bg-emerald-500' : 'bg-purple-500'
                          }`} />
                          <h4 className="text-sm font-semibold">
                            {subject} (Q{showOldNumbering ? oldStart : startIdx + 1}-Q{showOldNumbering ? oldEnd : endIdx})
                          </h4>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {Array.from({ length: 45 }, (_, i) => i + startIdx).map(renderOMRRow)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Correct Answers (180 digits)</label>
                  <Textarea
                    placeholder="e.g., 1131423132431413141331312132131213131213..."
                    value={testData.correctAnswerString}
                    onChange={(e) => setTestData({ ...testData, correctAnswerString: e.target.value.replace(/[^1-4]/g, '') })}
                    className="font-mono text-sm"
                    rows={4}
                    maxLength={180}
                  />
                  <p className="text-xs text-muted-foreground">
                    {testData.correctAnswerString.length}/180 digits entered
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={saveAndRecalculate}
              size="lg"
              className="w-full text-base font-medium hover:scale-105 transition-transform duration-200 active:scale-95 shadow-md hover:shadow-lg"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save & Re-calculate
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6 border border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">NEET Scoring System</h3>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
                <span>Correct: +4</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-600 dark:text-red-400 font-semibold">✗</span>
                <span>Wrong: -1</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-semibold">○</span>
                <span>Unmarked: 0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Test Analyzer - NEET Analysis
        </div>
      </footer>
    </div>
  )
}
