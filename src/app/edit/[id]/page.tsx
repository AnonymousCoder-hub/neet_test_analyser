'use client'

import { useState, useLayoutEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Loader2, Timer, BookOpen, StickyNote, Leaf } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth, pushSingleRecord } from '@/lib/auth-store'

// Subject configuration
const SUBJECTS = [
  { id: 'physics', name: 'Physics', color: 'bg-blue-500', startIdx: 0, endIdx: 45 },
  { id: 'chemistry', name: 'Chemistry', color: 'bg-green-500', startIdx: 45, endIdx: 90 },
  { id: 'botany', name: 'Botany', color: 'bg-emerald-500', startIdx: 90, endIdx: 135 },
  { id: 'zoology', name: 'Zoology', color: 'bg-purple-500', startIdx: 135, endIdx: 180 },
]

export default function EditPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.id as string

  const [testData, setTestData] = useState({
    testName: '',
    omrMarkedAnswers: Array(180).fill('0'),
    correctAnswerString: '',
    timeSlipEnabled: false,
    timeHours: 3,
    timeMinutes: 0,
    notes: '',
    selectedSubjects: {
      physics: true,
      chemistry: true,
      botany: true,
      zoology: true,
    },
    combinedBiology: false,
  })
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string | null>(null)
  const [showOldNumbering, setShowOldNumbering] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Display subjects (merge Botany+Zoology into Biology when combined)
  const displaySubjects = testData.combinedBiology
    ? [
        { id: 'physics', name: 'Physics', color: 'bg-blue-500', startIdx: 0, endIdx: 45 },
        { id: 'chemistry', name: 'Chemistry', color: 'bg-green-500', startIdx: 45, endIdx: 90 },
        { id: 'biology', name: 'Biology', color: 'bg-teal-500', startIdx: 90, endIdx: 180 },
      ]
    : SUBJECTS

  // Check if a display subject is selected
  const isDisplaySubjectSelected = (subjectId: string): boolean => {
    if (testData.combinedBiology && subjectId === 'biology') {
      return testData.selectedSubjects.botany && testData.selectedSubjects.zoology
    }
    return testData.selectedSubjects[subjectId as keyof typeof testData.selectedSubjects]
  }

  // Get selected subjects info
  const getSelectedSubjectsList = () => displaySubjects.filter(s => isDisplaySubjectSelected(s.id))
  const getSelectedSubjectsCount = () => getSelectedSubjectsList().length
  const getMaxMarks = () => {
    if (testData.combinedBiology) {
      let marks = 0
      if (testData.selectedSubjects.physics) marks += 180
      if (testData.selectedSubjects.chemistry) marks += 180
      if (testData.selectedSubjects.botany) marks += 360
      return marks
    }
    return getSelectedSubjectsCount() * 180
  }

  // Toggle subject selection
  const toggleSubject = (subjectId: string) => {
    if (testData.combinedBiology && subjectId === 'biology') {
      const bothSelected = testData.selectedSubjects.botany && testData.selectedSubjects.zoology
      setTestData(prev => ({
        ...prev,
        selectedSubjects: {
          ...prev.selectedSubjects,
          botany: !bothSelected,
          zoology: !bothSelected,
        }
      }))
    } else {
      setTestData(prev => ({
        ...prev,
        selectedSubjects: {
          ...prev.selectedSubjects,
          [subjectId]: !prev.selectedSubjects[subjectId as keyof typeof prev.selectedSubjects]
        }
      }))
    }
  }

  useLayoutEffect(() => {
    const records = JSON.parse(localStorage.getItem('testRecords') || '[]')
    const test = records.find((r: any) => r.id === testId)

    if (test) {
      let marked: string[]
      if (Array.isArray(test.markedAnswers)) {
        marked = test.markedAnswers
      } else {
        marked = test.markedAnswers?.replace(/\s/g, '').split('') || Array(180).fill('0')
      }
      const correct = test.correctAnswers?.replace(/\s/g, '') || ''
      
      requestAnimationFrame(() => {
        setTestData({
          testName: test.testName,
          omrMarkedAnswers: marked,
          correctAnswerString: correct,
          timeSlipEnabled: test.timeSlipEnabled || false,
          timeHours: test.timeTaken?.hours ?? 3,
          timeMinutes: test.timeTaken?.minutes ?? 0,
          notes: test.notes || '',
          selectedSubjects: test.selectedSubjects || {
            physics: true,
            chemistry: true,
            botany: true,
            zoology: true,
          },
          combinedBiology: test.combinedBiology || false,
        })
        setOriginalCreatedAt(test.createdAt || null)
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

  const getSubjectForIndex = (index: number): string => {
    if (index < 45) return 'Physics'
    if (index < 90) return 'Chemistry'
    if (index < 135) return 'Botany'
    return 'Zoology'
  }

  const getSubjectIdForIndex = (index: number): string => {
    if (index < 45) return 'physics'
    if (index < 90) return 'chemistry'
    if (index < 135) return 'botany'
    return 'zoology'
  }

  const isSubjectSelected = (subjectId: string): boolean => {
    return testData.selectedSubjects[subjectId as keyof typeof testData.selectedSubjects]
  }

  const renderOMRRow = (index: number, isSubjectDisabled: boolean = false) => {
    const displayNumber = getDisplayQuestionNumber(index)
    return (
      <div key={index} className={`flex items-center gap-3 ${isSubjectDisabled ? 'opacity-40' : ''}`}>
        <span className="w-8 text-xs font-medium text-muted-foreground text-right flex-shrink-0 pt-2">
          {displayNumber}
        </span>
        <div className="flex-1 flex border border-white/10 rounded-lg overflow-hidden bg-background shadow-sm">
          {['1', '2', '3', '4'].map((option) => (
            <button
              key={option}
              onClick={() => {
                if (isSubjectDisabled) return
                const newAnswers = [...testData.omrMarkedAnswers]
                if (newAnswers[index] === option) {
                  newAnswers[index] = '0'
                } else {
                  newAnswers[index] = option
                }
                setTestData({ ...testData, omrMarkedAnswers: newAnswers })
              }}
              disabled={isSubjectDisabled}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all duration-200 relative ${
                testData.omrMarkedAnswers[index] === option
                  ? 'bg-white text-black shadow-inner'
                  : 'text-muted-foreground/70 hover:bg-white/5 hover:text-foreground'
              } ${isSubjectDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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

  const calculateTimeSlip = (): number => {
    const totalMinutes = testData.timeHours * 60 + testData.timeMinutes
    const standardTime = 180
    return totalMinutes - standardTime
  }

  const saveAndRecalculate = () => {
    const marked = testData.omrMarkedAnswers
    const correct = testData.correctAnswerString.replace(/\s/g, '').split('')

    if (getSelectedSubjectsCount() === 0) {
      alert('Please select at least one subject')
      return
    }

    setSaving(true)

    const getSubjectForQuestion = (qNum: number): string => {
      if (qNum <= 45) return 'Physics'
      if (qNum <= 90) return 'Chemistry'
      if (qNum <= 135) return 'Botany'
      return 'Zoology'
    }

    const isSubjectSelectedForQuestion = (subject: string): boolean => {
      const subjectLower = subject.toLowerCase()
      return testData.selectedSubjects[subjectLower as keyof typeof testData.selectedSubjects]
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
    let totalQuestionsIncluded = 0

    for (let i = 0; i < 180; i++) {
      const qNum = i + 1
      const subject = getSubjectForQuestion(qNum)
      
      // Skip if subject is not selected
      if (!isSubjectSelectedForQuestion(subject)) {
        continue
      }
      
      totalQuestionsIncluded++
      
      const markedAnswer = marked[i]
      const correctAnswer = correct[i]
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
    const maxMarks = getMaxMarks()

    // Calculate subject marks only for selected subjects
    const physicsMarks = testData.selectedSubjects.physics ? (subjectWiseData['Physics'].correct * 4) - (subjectWiseData['Physics'].wrong * 1) : 0
    const chemistryMarks = testData.selectedSubjects.chemistry ? (subjectWiseData['Chemistry'].correct * 4) - (subjectWiseData['Chemistry'].wrong * 1) : 0
    const botanyMarks = testData.selectedSubjects.botany ? (subjectWiseData['Botany'].correct * 4) - (subjectWiseData['Botany'].wrong * 1) : 0
    const zoologyMarks = testData.selectedSubjects.zoology ? (subjectWiseData['Zoology'].correct * 4) - (subjectWiseData['Zoology'].wrong * 1) : 0

    const overall = {
      testName: testData.testName || `Test ${Date.now()}`,
      totalQuestions: totalQuestionsIncluded,
      totalCorrect,
      totalWrong,
      totalUnmarked,
      totalMarks,
      maxMarks,
      percentage: ((totalMarks / maxMarks) * 100).toFixed(2),
      physicsMarks,
      chemistryMarks,
      botanyMarks,
      zoologyMarks,
      subjects: statsArray,
      questions: questionResults,
      selectedSubjects: testData.selectedSubjects,
      notes: testData.notes,
      timeSlipEnabled: testData.timeSlipEnabled,
      timeTaken: testData.timeSlipEnabled ? { hours: testData.timeHours, minutes: testData.timeMinutes } : null,
      timeSlipMinutes: testData.timeSlipEnabled ? calculateTimeSlip() : null,
      // Combined Biology
      combinedBiology: testData.combinedBiology,
    }

    const record = {
      id: testId,
      testName: overall.testName,
      markedAnswers: marked.join(''),
      correctAnswers: testData.correctAnswerString.replace(/\s/g, ''),
      totalMarks: overall.totalMarks,
      maxMarks: overall.maxMarks,
      percentage: parseFloat(overall.percentage),
      totalCorrect,
      totalWrong,
      totalUnmarked,
      physicsMarks: overall.physicsMarks,
      chemistryMarks: overall.chemistryMarks,
      botanyMarks: overall.botanyMarks,
      zoologyMarks: overall.zoologyMarks,
      createdAt: originalCreatedAt || new Date().toISOString(),
      selectedSubjects: testData.selectedSubjects,
      notes: testData.notes,
      timeSlipEnabled: testData.timeSlipEnabled,
      timeTaken: testData.timeSlipEnabled ? { hours: testData.timeHours, minutes: testData.timeMinutes } : null,
      timeSlipMinutes: testData.timeSlipEnabled ? calculateTimeSlip() : null,
      // Combined Biology
      combinedBiology: testData.combinedBiology,
    }

    const records = JSON.parse(localStorage.getItem('testRecords') || '[]')
    const index = records.findIndex((r: any) => r.id === testId)
    if (index !== -1) {
      records[index] = record
      localStorage.setItem('testRecords', JSON.stringify(records))
    }

    localStorage.setItem(`analysis-${testId}`, JSON.stringify(overall))

    // Auto-push to cloud if logged in
    const { token: authToken, isAuthenticated } = useAuth.getState()
    if (isAuthenticated && authToken) {
      pushSingleRecord(authToken, record).catch(() => {})
    }

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

            {/* Subject Selection */}
            <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Subject Selection</h3>
                  <p className="text-xs text-muted-foreground">Select subjects to include in analysis ({getSelectedSubjectsCount()} selected · Max: {getMaxMarks()} marks)</p>
                </div>
              </div>
              
              {/* Combined Biology Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-teal-500/5 border border-teal-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-teal-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Combined Biology Mode</h4>
                    <p className="text-xs text-muted-foreground">Merge Botany + Zoology into single Biology section</p>
                  </div>
                </div>
                <button
                  onClick={() => setTestData({ ...testData, combinedBiology: !testData.combinedBiology })}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 ease-in-out ${
                    testData.combinedBiology 
                      ? 'bg-teal-500 shadow-lg shadow-teal-500/30' 
                      : 'bg-input hover:bg-muted'
                  }`}
                  aria-pressed={testData.combinedBiology}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
                      testData.combinedBiology ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className={`grid gap-3 ${testData.combinedBiology ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
                {displaySubjects.map((subject) => {
                  const isSelected = isDisplaySubjectSelected(subject.id)
                  return (
                    <button
                      key={subject.id}
                      onClick={() => toggleSubject(subject.id)}
                      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 ${
                        isSelected 
                          ? 'border-primary bg-primary/10 shadow-md shadow-primary/20' 
                          : 'border-border bg-background hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${subject.color} ${isSelected ? '' : 'opacity-40'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {subject.name}
                      </span>
                      <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isSelected 
                          ? 'border-primary bg-primary' 
                          : 'border-muted-foreground/30 bg-background'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes Section */}
            <div className="rounded-xl border-2 border-dashed border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <StickyNote className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Notes (Optional)</h3>
                  <p className="text-xs text-muted-foreground">Add any notes about this test</p>
                </div>
              </div>
              <Textarea
                placeholder="e.g., Felt tired during Physics, need to improve Chemistry..."
                value={testData.notes}
                onChange={(e) => setTestData({ ...testData, notes: e.target.value })}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{testData.notes.length}/500 characters</p>
            </div>

            {/* Time Slip Section */}
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Timer className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Time Slip</h3>
                    <p className="text-xs text-muted-foreground">Track if you exceeded the 3-hour limit</p>
                  </div>
                </div>
                <button
                  onClick={() => setTestData({ ...testData, timeSlipEnabled: !testData.timeSlipEnabled })}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 ease-in-out ${
                    testData.timeSlipEnabled 
                      ? 'bg-primary shadow-lg shadow-primary/30' 
                      : 'bg-input hover:bg-muted'
                  }`}
                  aria-pressed={testData.timeSlipEnabled}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
                      testData.timeSlipEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {testData.timeSlipEnabled && (
                <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1.5 block">Time Taken</label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-background rounded-lg border px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={testData.timeHours}
                            onChange={(e) => setTestData({ ...testData, timeHours: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)) })}
                            className="w-10 text-center font-semibold text-lg bg-transparent outline-none"
                          />
                          <span className="text-muted-foreground text-sm">h</span>
                        </div>
                        <div className="flex items-center gap-1 bg-background rounded-lg border px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={testData.timeMinutes}
                            onChange={(e) => setTestData({ ...testData, timeMinutes: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)) })}
                            className="w-10 text-center font-semibold text-lg bg-transparent outline-none"
                          />
                          <span className="text-muted-foreground text-sm">m</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        calculateTimeSlip() > 0 ? 'text-red-500' : 
                        calculateTimeSlip() < 0 ? 'text-green-500' : 'text-muted-foreground'
                      }`}>
                        {calculateTimeSlip() > 0 ? '+' : ''}{calculateTimeSlip()} min
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {calculateTimeSlip() > 0 ? 'over 3h' : calculateTimeSlip() < 0 ? 'under 3h' : 'exactly 3h'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                  {testData.combinedBiology ? (
                    <>
                      {/* Physics */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <h4 className="text-sm font-semibold">
                            Physics (Q{showOldNumbering ? '1' : '1'}-Q{showOldNumbering ? '45' : '45'})
                          </h4>
                          {!testData.selectedSubjects.physics && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Not Selected</span>
                          )}
                        </div>
                        <div className={`space-y-2 max-h-64 overflow-y-auto ${!testData.selectedSubjects.physics ? 'opacity-40 pointer-events-none' : ''}`}>
                          {Array.from({ length: 45 }, (_, i) => i).map((idx) => renderOMRRow(idx, !testData.selectedSubjects.physics))}
                        </div>
                      </div>
                      {/* Chemistry */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <h4 className="text-sm font-semibold">
                            Chemistry (Q{showOldNumbering ? '51' : '46'}-Q{showOldNumbering ? '95' : '90'})
                          </h4>
                          {!testData.selectedSubjects.chemistry && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Not Selected</span>
                          )}
                        </div>
                        <div className={`space-y-2 max-h-64 overflow-y-auto ${!testData.selectedSubjects.chemistry ? 'opacity-40 pointer-events-none' : ''}`}>
                          {Array.from({ length: 45 }, (_, i) => i + 45).map((idx) => renderOMRRow(idx, !testData.selectedSubjects.chemistry))}
                        </div>
                      </div>
                      {/* Biology */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500" />
                          <h4 className="text-sm font-semibold">
                            Biology (Q{showOldNumbering ? '101' : '91'}-Q{showOldNumbering ? '195' : '180'})
                          </h4>
                          {!(testData.selectedSubjects.botany && testData.selectedSubjects.zoology) && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Not Selected</span>
                          )}
                        </div>
                        <div className={`space-y-2 max-h-96 overflow-y-auto ${!(testData.selectedSubjects.botany && testData.selectedSubjects.zoology) ? 'opacity-40 pointer-events-none' : ''}`}>
                          {Array.from({ length: 90 }, (_, i) => i + 90).map((idx) => renderOMRRow(idx, !(testData.selectedSubjects.botany && testData.selectedSubjects.zoology)))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {SUBJECTS.map((subject) => {
                        const isSelected = testData.selectedSubjects[subject.id as keyof typeof testData.selectedSubjects]
                        const oldStart = subject.startIdx === 0 ? 1 : subject.startIdx === 45 ? 51 : subject.startIdx === 90 ? 101 : 151
                        const oldEnd = oldStart + 44
                        return (
                          <div key={subject.id} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${subject.color}`} />
                              <h4 className="text-sm font-semibold">
                                {subject.name} (Q{showOldNumbering ? oldStart : subject.startIdx + 1}-Q{showOldNumbering ? oldEnd : subject.endIdx})
                              </h4>
                              {!isSelected && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Not Selected</span>
                              )}
                            </div>
                            <div className={`space-y-2 max-h-64 overflow-y-auto ${!isSelected ? 'opacity-40 pointer-events-none' : ''}`}>
                              {Array.from({ length: 45 }, (_, i) => i + subject.startIdx).map((idx) => renderOMRRow(idx, !isSelected))}
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
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
              disabled={saving || getSelectedSubjectsCount() === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save & Re-calculate ({getSelectedSubjectsCount()} subject{getSelectedSubjectsCount() !== 1 ? 's' : ''} · {getMaxMarks()} marks)
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
