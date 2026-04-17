'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Home, Calculator, Keyboard, MousePointer2, ScanLine, Timer, BookOpen, StickyNote } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { OMRScannerDialog } from '@/components/omr-scanner-dialog'

// Subject configuration
const SUBJECTS = [
  { id: 'physics', name: 'Physics', color: 'bg-blue-500', startIdx: 0, endIdx: 45 },
  { id: 'chemistry', name: 'Chemistry', color: 'bg-green-500', startIdx: 45, endIdx: 90 },
  { id: 'botany', name: 'Botany', color: 'bg-emerald-500', startIdx: 90, endIdx: 135 },
  { id: 'zoology', name: 'Zoology', color: 'bg-purple-500', startIdx: 135, endIdx: 180 },
]

export default function AnalyzePage() {
  const [testName, setTestName] = useState('')
  const [markedAnswers, setMarkedAnswers] = useState('')
  const [correctAnswers, setCorrectAnswers] = useState('')
  const [inputMode, setInputMode] = useState<'manual' | 'omr' | 'scanner'>('manual')
  const [showOldNumbering, setShowOldNumbering] = useState(false)
  const [omrMarkedAnswers, setOmrMarkedAnswers] = useState<string[]>(Array(180).fill('0'))
  const [analyzing, setAnalyzing] = useState(false)
  const [omrScannerOpen, setOmrScannerOpen] = useState(false)
  
  // Subject Selection - default all selected
  const [selectedSubjects, setSelectedSubjects] = useState({
    physics: true,
    chemistry: true,
    botany: true,
    zoology: true,
  })
  
  // Notes field
  const [notes, setNotes] = useState('')
  
  // Time Slip Feature
  const [timeSlipEnabled, setTimeSlipEnabled] = useState(false)
  const [timeHours, setTimeHours] = useState(3)
  const [timeMinutes, setTimeMinutes] = useState(0)
  
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  // Get selected subjects info
  const getSelectedSubjectsList = () => SUBJECTS.filter(s => selectedSubjects[s.id as keyof typeof selectedSubjects])
  const getSelectedSubjectsCount = () => getSelectedSubjectsList().length
  const getMaxMarks = () => getSelectedSubjectsCount() * 180
  const getTotalQuestions = () => getSelectedSubjectsCount() * 45

  // Toggle subject selection
  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId as keyof typeof prev]
    }))
  }

  const parseAnswers = (answerString: string): string[] => {
    const cleaned = answerString.replace(/\s/g, '')
    return cleaned.split('')
  }

  const getDisplayQuestionNumber = (index: number): number => {
    if (!showOldNumbering) {
      return index + 1
    }
    if (index < 45) return index + 1
    if (index < 90) return index + 6
    if (index < 135) return index + 11
    return index + 16
  }

  const getSubjectForQuestion = (questionNumber: number): string => {
    if (questionNumber <= 45) return 'Physics'
    if (questionNumber <= 90) return 'Chemistry'
    if (questionNumber <= 135) return 'Botany'
    return 'Zoology'
  }

  const getSubjectIdForQuestion = (questionNumber: number): string => {
    if (questionNumber <= 45) return 'physics'
    if (questionNumber <= 90) return 'chemistry'
    if (questionNumber <= 135) return 'botany'
    return 'zoology'
  }

  // Check if a subject is selected
  const isSubjectSelected = (subject: string): boolean => {
    const subjectLower = subject.toLowerCase()
    return selectedSubjects[subjectLower as keyof typeof selectedSubjects]
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
              onClick={() => !isSubjectDisabled && handleOmroptionSelect(index, option)}
              disabled={isSubjectDisabled}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all duration-200 relative ${
                omrMarkedAnswers[index] === option
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

  const handleOmroptionSelect = (questionIndex: number, option: string) => {
    const newAnswers = [...omrMarkedAnswers]
    if (newAnswers[questionIndex] === option) {
      newAnswers[questionIndex] = '0'
    } else {
      newAnswers[questionIndex] = option
    }
    setOmrMarkedAnswers(newAnswers)
  }

  const handleAnswersDetected = (answers: string[]) => {
    setOmrMarkedAnswers(answers)
    setInputMode('omr')
  }

  // Calculate time slip (time over 3 hours in minutes)
  const calculateTimeSlip = (): number => {
    const totalMinutes = timeHours * 60 + timeMinutes
    const standardTime = 180 // 3 hours in minutes
    return totalMinutes - standardTime
  }

  const analyzeTest = () => {
    const marked = inputMode === 'omr' || inputMode === 'scanner' ? omrMarkedAnswers : parseAnswers(markedAnswers)
    const correct = parseAnswers(correctAnswers)

    // Validate based on selected subjects
    const selectedCount = getSelectedSubjectsCount()
    if (selectedCount === 0) {
      alert('Please select at least one subject')
      return
    }

    if (marked.length !== 180 || correct.length !== 180) {
      alert('Please provide exactly 180 digits for both marked and correct answers')
      return
    }

    setAnalyzing(true)

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
      const subjectId = getSubjectIdForQuestion(qNum)
      
      // Skip if subject is not selected
      if (!isSubjectSelected(subject)) {
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
    const physicsMarks = selectedSubjects.physics ? (subjectWiseData['Physics'].correct * 4) - (subjectWiseData['Physics'].wrong * 1) : 0
    const chemistryMarks = selectedSubjects.chemistry ? (subjectWiseData['Chemistry'].correct * 4) - (subjectWiseData['Chemistry'].wrong * 1) : 0
    const botanyMarks = selectedSubjects.botany ? (subjectWiseData['Botany'].correct * 4) - (subjectWiseData['Botany'].wrong * 1) : 0
    const zoologyMarks = selectedSubjects.zoology ? (subjectWiseData['Zoology'].correct * 4) - (subjectWiseData['Zoology'].wrong * 1) : 0

    const overall = {
      testName: testName || `Test ${Date.now()}`,
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
      selectedSubjects,
      notes,
      // Time slip data
      timeSlipEnabled,
      timeTaken: timeSlipEnabled ? { hours: timeHours, minutes: timeMinutes } : null,
      timeSlipMinutes: timeSlipEnabled ? calculateTimeSlip() : null,
    }

    const record = {
      id: Date.now().toString(),
      testName: overall.testName,
      markedAnswers: Array.isArray(marked) ? marked.join('') : marked,
      correctAnswers: Array.isArray(correct) ? correct.join('') : correct,
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
      createdAt: new Date().toISOString(),
      selectedSubjects,
      notes,
      // Time slip data
      timeSlipEnabled,
      timeTaken: timeSlipEnabled ? { hours: timeHours, minutes: timeMinutes } : null,
      timeSlipMinutes: timeSlipEnabled ? calculateTimeSlip() : null,
    }

    const records = JSON.parse(localStorage.getItem('testRecords') || '[]')
    records.unshift(record)
    localStorage.setItem('testRecords', JSON.stringify(records))
    localStorage.setItem(`analysis-${record.id}`, JSON.stringify(overall))

    router.push(`/results/${record.id}`)
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
                New Test Analysis
              </h1>
              <p className="text-sm text-muted-foreground">Enter your test details to analyze performance</p>
            </div>
          </div>
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="hover:scale-105 transition-transform duration-200 active:scale-95 hover:border-primary/50"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg">Enter Your Test Details</CardTitle>
                <CardDescription className="mt-2 leading-relaxed">
                  {inputMode === 'manual' ? (
                    <>
                      Enter 180 digits representing your marked answers (0 = no option marked) and the correct answers.<br />
                      <span className="text-xs text-muted-foreground/80">First 45: Physics, Next 45: Chemistry, Next 45: Botany, Last 45: Zoology</span>
                    </>
                  ) : inputMode === 'omr' ? (
                    <>
                      Select your answers for each question visually using the option buttons.<br />
                      <span className="text-xs text-muted-foreground/80">First 45: Physics, Next 45: Chemistry, Next 45: Botany, Last 45: Zoology</span>
                    </>
                  ) : (
                    <>
                      Scan your OMR answer sheet to automatically detect your marked answers.<br />
                      <span className="text-xs text-muted-foreground/80">After scanning, you can review and adjust the detected answers</span>
                    </>
                  )}
                </CardDescription>
              </div>
              <Select value={inputMode} onValueChange={(v: 'manual' | 'omr' | 'scanner') => setInputMode(v)}>
                <SelectTrigger className="w-[160px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <Keyboard className="w-4 h-4" />
                      <span>Mode 1: Type</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="omr">
                    <div className="flex items-center gap-2">
                      <MousePointer2 className="w-4 h-4" />
                      <span>Mode 2: OMR</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="scanner">
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-4 h-4" />
                      <span>Mode 3: Scan</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Name</label>
              <Input
                placeholder="e.g., NEET 2025 Mock Test 1"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="text-base"
              />
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
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SUBJECTS.map((subject) => {
                  const isSelected = selectedSubjects[subject.id as keyof typeof selectedSubjects]
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{notes.length}/500 characters</p>
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
                  onClick={() => setTimeSlipEnabled(!timeSlipEnabled)}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 ease-in-out ${
                    timeSlipEnabled 
                      ? 'bg-primary shadow-lg shadow-primary/30' 
                      : 'bg-input hover:bg-muted'
                  }`}
                  aria-pressed={timeSlipEnabled}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
                      timeSlipEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {timeSlipEnabled && (
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
                            value={timeHours}
                            onChange={(e) => setTimeHours(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                            className="w-10 text-center font-semibold text-lg bg-transparent outline-none"
                          />
                          <span className="text-muted-foreground text-sm">h</span>
                        </div>
                        <div className="flex items-center gap-1 bg-background rounded-lg border px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={timeMinutes}
                            onChange={(e) => setTimeMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
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
                  
                  {/* Visual Time Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>0h</span>
                      <span className="font-medium">3h (Standard)</span>
                      <span>6h</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                      <div 
                        className="absolute h-full bg-green-500/50 transition-all duration-300"
                        style={{ width: '50%' }}
                      />
                      <div 
                        className={`absolute h-full transition-all duration-300 ${
                          calculateTimeSlip() > 0 ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, ((timeHours * 60 + timeMinutes) / 360) * 100)}%` }}
                      />
                      <div 
                        className="absolute h-full w-0.5 bg-foreground/50"
                        style={{ left: '50%' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {inputMode === 'manual' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Marked Answers (180 digits)</label>
                  <Textarea
                    placeholder="e.g., 1131331413243131013131012101011013131..."
                    value={markedAnswers}
                    onChange={(e) => setMarkedAnswers(e.target.value.replace(/[^0-4]/g, ''))}
                    className="font-mono text-sm"
                    rows={4}
                    maxLength={180}
                  />
                  <p className="text-xs text-muted-foreground">
                    {markedAnswers.length}/180 digits entered
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Correct Answers (180 digits)</label>
                  <Textarea
                    placeholder="e.g., 1131423132431413141331312132131213131213..."
                    value={correctAnswers}
                    onChange={(e) => setCorrectAnswers(e.target.value.replace(/[^1-4]/g, ''))}
                    className="font-mono text-sm"
                    rows={4}
                    maxLength={180}
                  />
                  <p className="text-xs text-muted-foreground">
                    {correctAnswers.length}/180 digits entered
                  </p>
                </div>
              </>
            ) : inputMode === 'omr' ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Select Your Answers</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground cursor-pointer" htmlFor="old-numbering">
                          Old OMR Numbering
                        </label>
                        <input
                          type="checkbox"
                          id="old-numbering"
                          checked={showOldNumbering}
                          onChange={(e) => setShowOldNumbering(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">
                        {omrMarkedAnswers.filter(a => a !== '0').length} / 180 answered
                      </span>
                    </div>
                  </div>
                </div>

                {/* Physics Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <h3 className="text-sm font-semibold">
                      Physics (Q{showOldNumbering ? '1' : '1'}-Q{showOldNumbering ? '45' : '45'})
                    </h3>
                    {!selectedSubjects.physics && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Not Selected</span>
                    )}
                  </div>
                  <div className={`space-y-2 max-h-64 overflow-y-auto ${!selectedSubjects.physics ? 'opacity-40 pointer-events-none' : ''}`}>
                    {Array.from({ length: 45 }, (_, i) => i).map((idx) => renderOMRRow(idx, !selectedSubjects.physics))}
                  </div>
                </div>

                {/* Chemistry Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <h3 className="text-sm font-semibold">
                      Chemistry (Q{showOldNumbering ? '51' : '46'}-Q{showOldNumbering ? '95' : '90'})
                    </h3>
                    {!selectedSubjects.chemistry && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Not Selected</span>
                    )}
                  </div>
                  <div className={`space-y-2 max-h-64 overflow-y-auto ${!selectedSubjects.chemistry ? 'opacity-40 pointer-events-none' : ''}`}>
                    {Array.from({ length: 45 }, (_, i) => i + 45).map((idx) => renderOMRRow(idx, !selectedSubjects.chemistry))}
                  </div>
                </div>

                {/* Botany Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-semibold">
                      Botany (Q{showOldNumbering ? '101' : '91'}-Q{showOldNumbering ? '145' : '135'})
                    </h3>
                    {!selectedSubjects.botany && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Not Selected</span>
                    )}
                  </div>
                  <div className={`space-y-2 max-h-64 overflow-y-auto ${!selectedSubjects.botany ? 'opacity-40 pointer-events-none' : ''}`}>
                    {Array.from({ length: 45 }, (_, i) => i + 90).map((idx) => renderOMRRow(idx, !selectedSubjects.botany))}
                  </div>
                </div>

                {/* Zoology Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <h3 className="text-sm font-semibold">
                      Zoology (Q{showOldNumbering ? '151' : '136'}-Q{showOldNumbering ? '195' : '180'})
                    </h3>
                    {!selectedSubjects.zoology && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Not Selected</span>
                    )}
                  </div>
                  <div className={`space-y-2 max-h-64 overflow-y-auto ${!selectedSubjects.zoology ? 'opacity-40 pointer-events-none' : ''}`}>
                    {Array.from({ length: 45 }, (_, i) => i + 135).map((idx) => renderOMRRow(idx, !selectedSubjects.zoology))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Correct Answers (180 digits)</label>
                  <Textarea
                    placeholder="e.g., 1131423132431413141331312132131213131213..."
                    value={correctAnswers}
                    onChange={(e) => setCorrectAnswers(e.target.value.replace(/[^1-4]/g, ''))}
                    className="font-mono text-sm"
                    rows={4}
                    maxLength={180}
                  />
                  <p className="text-xs text-muted-foreground">
                    {correctAnswers.length}/180 digits entered
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* OMR Scanner Mode */}
                <div className="py-8 text-center">
                  <div className="mb-4">
                    <ScanLine className="w-16 h-16 mx-auto text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Scan Your OMR Sheet</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Upload an image of your OMR answer sheet and the scanner will automatically detect your marked answers.
                      You can then review and adjust before submitting.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="px-8"
                    onClick={() => setOmrScannerOpen(true)}
                  >
                    <ScanLine className="w-5 h-5 mr-2" />
                    Open OMR Scanner
                  </Button>
                </div>

                {omrMarkedAnswers.some(a => a !== '0') && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Detected Answers</label>
                      <span className="text-xs text-muted-foreground">
                        {omrMarkedAnswers.filter(a => a !== '0').length} / 180 answered
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground cursor-pointer" htmlFor="old-numbering-scan">
                          Old OMR Numbering
                        </label>
                        <input
                          type="checkbox"
                          id="old-numbering-scan"
                          checked={showOldNumbering}
                          onChange={(e) => setShowOldNumbering(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOmrScannerOpen(true)}
                      >
                        <ScanLine className="w-3 h-3 mr-1" />
                        Re-scan
                      </Button>
                    </div>

                    {/* Physics Section */}
                    <div className={`space-y-2 mb-3 ${!selectedSubjects.physics ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <h3 className="text-xs font-semibold">Physics</h3>
                        {!selectedSubjects.physics && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Not Selected</span>
                        )}
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {Array.from({ length: 45 }, (_, i) => i).map((idx) => renderOMRRow(idx, !selectedSubjects.physics))}
                      </div>
                    </div>

                    {/* Chemistry Section */}
                    <div className={`space-y-2 mb-3 ${!selectedSubjects.chemistry ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <h3 className="text-xs font-semibold">Chemistry</h3>
                        {!selectedSubjects.chemistry && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Not Selected</span>
                        )}
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {Array.from({ length: 45 }, (_, i) => i + 45).map((idx) => renderOMRRow(idx, !selectedSubjects.chemistry))}
                      </div>
                    </div>

                    {/* Botany Section */}
                    <div className={`space-y-2 mb-3 ${!selectedSubjects.botany ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h3 className="text-xs font-semibold">Botany</h3>
                        {!selectedSubjects.botany && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Not Selected</span>
                        )}
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {Array.from({ length: 45 }, (_, i) => i + 90).map((idx) => renderOMRRow(idx, !selectedSubjects.botany))}
                      </div>
                    </div>

                    {/* Zoology Section */}
                    <div className={`space-y-2 ${!selectedSubjects.zoology ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <h3 className="text-xs font-semibold">Zoology</h3>
                        {!selectedSubjects.zoology && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Not Selected</span>
                        )}
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {Array.from({ length: 45 }, (_, i) => i + 135).map((idx) => renderOMRRow(idx, !selectedSubjects.zoology))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Correct Answers (180 digits)</label>
                  <Textarea
                    placeholder="e.g., 1131423132431413141331312132131213131213..."
                    value={correctAnswers}
                    onChange={(e) => setCorrectAnswers(e.target.value.replace(/[^1-4]/g, ''))}
                    className="font-mono text-sm"
                    rows={4}
                    maxLength={180}
                  />
                  <p className="text-xs text-muted-foreground">
                    {correctAnswers.length}/180 digits entered
                  </p>
                </div>
              </>
            )}

            <Button
              onClick={analyzeTest}
              size="lg"
              className="w-full text-base font-medium hover:scale-105 transition-transform duration-200 active:scale-95 shadow-md hover:shadow-lg"
              disabled={analyzing || getSelectedSubjectsCount() === 0}
            >
              <Calculator className="w-5 h-5 mr-2" />
              {analyzing ? 'Analyzing...' : 'Analyze Test'}
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

      {/* OMR Scanner Dialog */}
      <OMRScannerDialog
        open={omrScannerOpen}
        onOpenChange={setOmrScannerOpen}
        onAnswersDetected={handleAnswersDetected}
      />

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
          Test Analyzer - NEET Analysis
        </div>
      </footer>
    </div>
  )
}
