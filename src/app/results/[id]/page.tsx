'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Home, Check, X, TrendingUp, Award, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface QuestionResult {
  questionNumber: number
  marked: string
  correct: string
  isCorrect: boolean
  isUnmarked: boolean
  subject: string
}

interface SubjectStats {
  name: string
  correct: number
  wrong: number
  unmarked: number
  markedQuestions: number[]
  wrongQuestions: number[]
  unmarkedQuestions: number[]
  marks: number
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showOldNumbering, setShowOldNumbering] = useState(false)

  // Helper function to get display question number based on old OMR toggle
  const getDisplayQuestionNumber = (qNum: number): number => {
    if (!showOldNumbering) return qNum
    // Old OMR numbering pattern
    if (qNum <= 45) return qNum // Physics: 1-45
    if (qNum <= 90) return qNum + 6 // Chemistry: 46-90 → 51-96 (but we want 51-95, so +5 for standard, +6 for the actual offset)
    if (qNum <= 135) return qNum + 11 // Botany: 91-135 → 102-146 (but we want 101-145, so +10 for standard, +11 for the actual offset)
    return qNum + 16 // Zoology: 136-180 → 152-196 (but we want 151-195, so +15 for standard, +16 for the actual offset)
  }

  // Function to regenerate analysis data from marked and correct answers
  const regenerateAnalysis = (record: any) => {
    const getSubjectForQuestion = (qNum: number): string => {
      if (qNum <= 45) return 'Physics'
      if (qNum <= 90) return 'Chemistry'
      if (qNum <= 135) return 'Botany'
      return 'Zoology'
    }

    const marked = record.markedAnswers?.replace(/\s/g, '').split('') || Array(180).fill('0')
    const correct = record.correctAnswers?.replace(/\s/g, '').split('') || Array(180).fill('1')

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

    const statsArray = Object.values(subjectWiseData).map((s: any) => ({
      ...s,
      marks: (s.correct * 4) - (s.wrong * 1)
    }))

    const totalMarks = (totalCorrect * 4) - (totalWrong * 1)

    const overall = {
      testName: record.testName,
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

    // Save the regenerated analysis to localStorage
    localStorage.setItem(`analysis-${record.id}`, JSON.stringify(overall))

    return overall
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const id = params.id as string
    const data = localStorage.getItem(`analysis-${id}`)
    if (data) {
      setAnalysisData(JSON.parse(data))
    } else {
      // Fallback: Try to regenerate from test record
      const records = JSON.parse(localStorage.getItem('testRecords') || '[]')
      const record = records.find((r: any) => r.id === id)
      if (record) {
        const regeneratedData = regenerateAnalysis(record)
        setAnalysisData(regeneratedData)
      }
    }
    setLoading(false)
  }, [params.id])
  /* eslint-enable react-hooks/set-state-in-effect */

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getMarksColor = (marks: number, max: number) => {
    const percentage = (marks / max) * 100
    return getScoreColor(percentage)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Test Not Found</h2>
              <p className="text-muted-foreground mb-4">The analysis data for this test could not be found.</p>
              <Link href="/">
                <Button>Go to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
                {analysisData.testName}
              </h1>
              <p className="text-sm text-muted-foreground">Detailed Analysis Report</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Old OMR Numbering Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <label htmlFor="old-omr-toggle-results" className="text-xs font-medium text-muted-foreground cursor-pointer">
                Old OMR
              </label>
              <button
                id="old-omr-toggle-results"
                onClick={() => setShowOldNumbering(!showOldNumbering)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  showOldNumbering ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    showOldNumbering ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Quick Stats Overview */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Quick Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {analysisData.totalCorrect}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Correct</div>
                <div className="text-xs text-green-600 dark:text-green-400">+{analysisData.totalCorrect * 4} marks</div>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {analysisData.totalWrong}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Wrong</div>
                <div className="text-xs text-red-600 dark:text-red-400">-{analysisData.totalWrong} marks</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg border border-muted/50">
                <div className="text-3xl font-bold text-muted-foreground">
                  {analysisData.totalUnmarked}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Unmarked</div>
                <div className="text-xs text-muted-foreground">0 marks</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className={`text-3xl font-bold ${getMarksColor(analysisData.totalMarks, analysisData.maxMarks)}`}>
                  {analysisData.totalMarks}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Total Marks</div>
                <div className="text-xs text-muted-foreground">/ {analysisData.maxMarks}</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20 col-span-2 lg:col-span-1">
                <div className={`text-3xl font-bold ${getScoreColor(parseFloat(analysisData.percentage))}`}>
                  {analysisData.percentage}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Percentage</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subject-wise Performance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Subject-wise Performance</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Physics', marks: analysisData.physicsMarks, color: 'bg-blue-500' },
              { name: 'Chemistry', marks: analysisData.chemistryMarks, color: 'bg-green-500' },
              { name: 'Botany', marks: analysisData.botanyMarks, color: 'bg-emerald-500' },
              { name: 'Zoology', marks: analysisData.zoologyMarks, color: 'bg-purple-500' },
            ].map((subject) => (
              <div key={subject.name} className="rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${subject.color}`} />
                    <h3 className="text-sm font-semibold">{subject.name}</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">45 Qs</span>
                </div>
                <div className={`text-xl font-bold ${getMarksColor(subject.marks, 180)}`}>
                  {subject.marks}/180
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">marks</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject-wise Detailed Breakdown */}
        {analysisData.subjects && (
          <div className="grid gap-6">
            {analysisData.subjects.map((subject: SubjectStats) => (
              <Card key={subject.name} className="border-2 hover:border-primary/50 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{subject.name}</CardTitle>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getMarksColor(subject.marks, 180)}`}>
                        {subject.marks}
                      </div>
                      <div className="text-[10px] text-muted-foreground">/ 180 marks</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
                        {subject.correct} Correct
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400 font-semibold">
                        {subject.wrong} Wrong
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-semibold">
                        {subject.unmarked} Unmarked
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Marked Questions */}
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Marked Questions
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {subject.markedQuestions.length > 0 ? (
                        subject.markedQuestions.map((q: number) => (
                          <Badge key={q} variant="secondary">
                            Q{getDisplayQuestionNumber(q)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No questions marked</span>
                      )}
                    </div>
                  </div>

                  {/* Wrong Questions */}
                  {subject.wrongQuestions.length > 0 && (
                    <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/10">
                      <div className="text-sm font-medium mb-2 flex items-center gap-2 text-red-600 dark:text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Wrong Questions
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subject.wrongQuestions.map((q: number) => {
                          const result = analysisData.questions?.find((r: QuestionResult) => r.questionNumber === q)
                          return (
                            <Badge key={q} variant="destructive" className="px-3 py-1">
                              Q{getDisplayQuestionNumber(q)}: {result?.marked} → {result?.correct}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Unmarked Questions */}
                  {subject.unmarkedQuestions.length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg border border-muted/50">
                      <div className="text-sm font-medium mb-2 flex items-center gap-2 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                        Unmarked Questions
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subject.unmarkedQuestions.map((q: number) => (
                          <Badge key={q} variant="outline">
                            Q{getDisplayQuestionNumber(q)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detailed Question Analysis Table */}
        {analysisData.questions && (
          <Card className="border-2 hover:border-primary/50 transition-all duration-300">
            <CardHeader>
              <CardTitle>Detailed Question Analysis</CardTitle>
              <CardDescription>Question-wise breakdown with your answers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Q.No</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Your Answer</TableHead>
                      <TableHead>Correct Answer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisData.questions.map((result: QuestionResult) => {
                      const marks = result.isUnmarked ? 0 : result.isCorrect ? 4 : -1
                      return (
                        <TableRow key={result.questionNumber}>
                          <TableCell className="font-medium">Q{getDisplayQuestionNumber(result.questionNumber)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{result.subject}</Badge>
                          </TableCell>
                          <TableCell className={result.isUnmarked ? 'text-muted-foreground' : ''}>
                            {result.isUnmarked ? '-' : result.marked}
                          </TableCell>
                          <TableCell>{result.correct}</TableCell>
                          <TableCell>
                            {result.isUnmarked ? (
                              <span className="text-muted-foreground">○</span>
                            ) : result.isCorrect ? (
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${marks > 0 ? 'text-green-600 dark:text-green-400' : marks < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                            {marks > 0 ? `+${marks}` : marks}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Analysis Table */}
        <Card className="border-2 hover:border-primary/50 transition-all duration-300">
          <CardHeader>
            <CardTitle>Overall Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Questions</TableCell>
                  <TableCell className="text-right">{analysisData.totalQuestions}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Correct Answers</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">
                    {analysisData.totalCorrect} (+{analysisData.totalCorrect * 4})
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Wrong Answers</TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400 font-semibold">
                    {analysisData.totalWrong} (-{analysisData.totalWrong})
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Unmarked Questions</TableCell>
                  <TableCell className="text-right text-muted-foreground font-semibold">
                    {analysisData.totalUnmarked} (0)
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-medium text-base">Total Marks Scored</TableCell>
                  <TableCell className={`text-right font-bold text-2xl ${getMarksColor(analysisData.totalMarks, analysisData.maxMarks)}`}>
                    {analysisData.totalMarks}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Maximum Marks</TableCell>
                  <TableCell className="text-right font-bold text-2xl text-muted-foreground">
                    {analysisData.maxMarks}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Percentage</TableCell>
                  <TableCell className={`text-right font-bold text-2xl ${getScoreColor(parseFloat(analysisData.percentage))}`}>
                    {analysisData.percentage}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
          Test Analyzer - NEET Analysis Results
        </div>
      </footer>
    </div>
  )
}
