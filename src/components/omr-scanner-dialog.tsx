'use client'

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Upload, Play, RotateCcw, Loader2, CheckCircle2, AlertCircle, Save, FolderOpen, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { processOMR } from '@/lib/omr-processor'

const NUM_COLS = 4
const OPTIONS = 4
const TOTAL_ROWS = 45

interface Preset {
  name: string
  createdAt: string
  settings: {
    rectX: number; rectY: number; rectW: number; rectH: number
    col1: number; col2: number; col3: number; col4: number
    optGap: number; bubbleR: number
    mode: string; sectionARows: number
    startY: number; endY: number
    secAStartY: number; secAEndY: number
    secBStartY: number; secBEndY: number
    globalYOffset: number
    col1Y: number; col2Y: number; col3Y: number; col4Y: number
    fillThreshold: number; minDifference: number
  }
}

interface OMRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAnswersDetected: (answers: string[]) => void
}

const LabeledSlider = memo(function LabeledSlider({
  label, value, onChange, min, max, colorClass = ''
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  colorClass?: string
}) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground flex justify-between mb-1">
        {label}
        <span className={`font-mono ${colorClass}`}>{value}</span>
      </label>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
        className="h-4"
      />
    </div>
  )
})

const ColumnSlider = memo(function ColumnSlider({
  value, onChange, idx, maxVal
}: {
  value: number
  onChange: (v: number) => void
  idx: number
  maxVal: number
}) {
  const COL_COLORS = ['text-sky-500', 'text-amber-500', 'text-emerald-500', 'text-rose-500']
  return (
    <div className="flex items-center gap-2">
      <span className={`w-6 text-[10px] font-medium ${COL_COLORS[idx]}`}>C{idx + 1}</span>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={maxVal}
        step={1}
        className="flex-1 h-4"
      />
      <span className="w-5 text-[10px] font-mono text-right">{value}</span>
    </div>
  )
})

const OffsetSlider = memo(function OffsetSlider({
  value, onChange, idx
}: {
  value: number
  onChange: (v: number) => void
  idx: number
}) {
  const COL_COLORS = ['text-sky-500', 'text-amber-500', 'text-emerald-500', 'text-rose-500']
  return (
    <div className="flex items-center gap-2">
      <span className={`w-6 text-[10px] font-medium ${COL_COLORS[idx]}`}>C{idx + 1}</span>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={-200}
        max={200}
        step={1}
        className="flex-1 h-4"
      />
      <span className={`w-8 text-[10px] font-mono text-right ${COL_COLORS[idx]}`}>
        {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  )
})

// Zoomable Image Component - supports scroll/pinch zoom and drag pan
const ZoomableImage = memo(function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const resetView = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.min(Math.max(prev * delta, 1), 10))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }, [position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers for mobile pinch-zoom
  const lastTouchDist = useRef<number | null>(null)
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y })
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      }
    }
  }, [position])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      })
    } else if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scaleDelta = dist / lastTouchDist.current
      
      setScale(prev => Math.min(Math.max(prev * scaleDelta, 1), 10))
      lastTouchDist.current = dist
    }
  }, [isDragging, dragStart])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    lastTouchDist.current = null
    lastTouchCenter.current = null
  }, [])

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-40 bg-black/5 rounded overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      <img 
        src={src} 
        alt={alt} 
        className="absolute top-1/2 left-1/2 origin-center pointer-events-none"
        style={{
          transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
        draggable={false}
      />
      <div className="absolute bottom-1 right-1 flex gap-1">
        <button 
          onClick={resetView}
          className="px-2 py-0.5 text-[9px] bg-black/50 text-white rounded hover:bg-black/70"
        >
          Reset
        </button>
        <span className="px-2 py-0.5 text-[9px] bg-black/50 text-white rounded">
          {Math.round(scale * 100)}%
        </span>
      </div>
      <div className="absolute bottom-1 left-1 text-[8px] text-muted-foreground bg-black/30 text-white px-1 rounded">
        Scroll to zoom • Drag to pan
      </div>
    </div>
  )
})

export function OMRScannerDialog({ open, onOpenChange, onAnswersDetected }: OMRScannerDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const [mode, setMode] = useState<'180Q' | '200Q'>('180Q')
  const [sectionARows, setSectionARows] = useState(35)

  const [rectX, setRectX] = useState(50)
  const [rectY, setRectY] = useState(100)
  const [rectW, setRectW] = useState(300)
  const [rectH, setRectH] = useState(800)

  const [col1, setCol1] = useState(20)
  const [col2, setCol2] = useState(95)
  const [col3, setCol3] = useState(170)
  const [col4, setCol4] = useState(245)

  const [startY, setStartY] = useState(15)
  const [endY, setEndY] = useState(700)

  const [secAStartY, setSecAStartY] = useState(15)
  const [secAEndY, setSecAEndY] = useState(500)
  const [secBStartY, setSecBStartY] = useState(550)
  const [secBEndY, setSecBEndY] = useState(700)

  const [optGap, setOptGap] = useState(15)
  const [bubbleR, setBubbleR] = useState(8)

  const [globalYOffset, setGlobalYOffset] = useState(0)
  const [col1Y, setCol1Y] = useState(0)
  const [col2Y, setCol2Y] = useState(0)
  const [col3Y, setCol3Y] = useState(0)
  const [col4Y, setCol4Y] = useState(0)

  const [fillThreshold, setFillThreshold] = useState(20)
  const [minDifference, setMinDifference] = useState(15)

  const [presets, setPresets] = useState<Preset[]>([])
  const [presetName, setPresetName] = useState('')
  const [showPresetPanel, setShowPresetPanel] = useState(false)

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mode: true, rect: true, cols: true, offsets: false, detection: false
  })

  const imgRef = useRef<HTMLImageElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const presetImportRef = useRef<HTMLInputElement>(null)
  const [displayWidth, setDisplayWidth] = useState(300)

  const cols = useMemo(() => [col1, col2, col3, col4], [col1, col2, col3, col4])
  const colYOffsets = useMemo(() => [col1Y, col2Y, col3Y, col4Y], [col1Y, col2Y, col3Y, col4Y])

  const getEffectiveOffset = useCallback((ci: number) => globalYOffset + colYOffsets[ci], [globalYOffset, colYOffsets])

  const getRowY = useCallback((ci: number, ri: number) => {
    const offset = getEffectiveOffset(ci)
    
    if (mode === '180Q') {
      if (TOTAL_ROWS <= 1) return startY + offset
      return startY + (endY - startY) * (ri / (TOTAL_ROWS - 1)) + offset
    }
    
    if (ri < sectionARows) {
      if (sectionARows <= 1) return secAStartY + offset
      return secAStartY + (secAEndY - secAStartY) * (ri / (sectionARows - 1)) + offset
    } else {
      const bRow = ri - sectionARows
      const bTotal = TOTAL_ROWS - sectionARows
      if (bTotal <= 1) return secBStartY + offset
      return secBStartY + (secBEndY - secBStartY) * (bRow / (bTotal - 1)) + offset
    }
  }, [mode, sectionARows, startY, endY, secAStartY, secAEndY, secBStartY, secBEndY, getEffectiveOffset])

  useEffect(() => {
    const saved = localStorage.getItem('omr-presets')
    if (saved) try { setPresets(JSON.parse(saved)) } catch (e) {}
  }, [])

  useEffect(() => {
    localStorage.setItem('omr-presets', JSON.stringify(presets))
  }, [presets])

  useEffect(() => {
    const updateDisplayWidth = () => {
      if (imgRef.current) setDisplayWidth(imgRef.current.clientWidth)
    }
    updateDisplayWidth()
    window.addEventListener('resize', updateDisplayWidth)
    return () => window.removeEventListener('resize', updateDisplayWidth)
  }, [image])

  const loadFile = useCallback((f: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const w = img.width, h = img.height
        setImgSize({ w, h })
        const dRX = Math.round(w * 0.05)
        const dRY = Math.round(h * 0.08)
        const dRW = Math.round(w * 0.35)
        const dRH = Math.round(h * 0.55)

        setRectX(dRX); setRectY(dRY); setRectW(dRW); setRectH(dRH)

        const cw = Math.round(dRW / 4)
        setCol1(Math.round(cw * 0.2)); setCol2(Math.round(cw * 1.2))
        setCol3(Math.round(cw * 2.2)); setCol4(Math.round(cw * 3.2))

        const rs = Math.round(dRH * 0.02)
        const re = Math.round(dRH * 0.98)
        setStartY(rs); setEndY(re)

        const sae = Math.round(rs + (re - rs) * 0.72)
        const sbs = Math.round(rs + (re - rs) * 0.78)
        setSecAStartY(rs); setSecAEndY(sae)
        setSecBStartY(sbs); setSecBEndY(re)

        setOptGap(Math.round(w * 0.015))
        setBubbleR(Math.round(Math.min(w, h) * 0.008))
        setGlobalYOffset(0)
        setCol1Y(0); setCol2Y(0); setCol3Y(0); setCol4Y(0)
        setFillThreshold(20); setMinDifference(15)
      }
      img.src = e.target!.result as string
      setImage(e.target!.result as string)
      setFile(f)
    }
    reader.readAsDataURL(f)
    setResult(null)
  }, [])

  const scale = imgSize ? displayWidth / imgSize.w : 1

  const toggleSection = useCallback((k: string) => 
    setExpandedSections(p => ({ ...p, [k]: !p[k] })), [])

  const handleModeChange = useCallback((newMode: '180Q' | '200Q') => {
    setMode(newMode)
    if (newMode === '200Q') {
      setSecAStartY(startY)
      setSecAEndY(Math.round(startY + (endY - startY) * 0.72))
      setSecBStartY(Math.round(startY + (endY - startY) * 0.78))
      setSecBEndY(endY)
    }
  }, [startY, endY])

  const getAllSettings = useCallback((): Preset['settings'] => ({
    rectX, rectY, rectW, rectH, col1, col2, col3, col4,
    optGap, bubbleR, mode, sectionARows,
    startY, endY, secAStartY, secAEndY, secBStartY, secBEndY,
    globalYOffset, col1Y, col2Y, col3Y, col4Y,
    fillThreshold, minDifference
  }), [rectX, rectY, rectW, rectH, col1, col2, col3, col4, optGap, bubbleR, mode, sectionARows,
      startY, endY, secAStartY, secAEndY, secBStartY, secBEndY, globalYOffset, col1Y, col2Y, col3Y, col4Y,
      fillThreshold, minDifference])

  const applySettings = useCallback((s: Preset['settings']) => {
    setRectX(s.rectX); setRectY(s.rectY); setRectW(s.rectW); setRectH(s.rectH)
    setCol1(s.col1); setCol2(s.col2); setCol3(s.col3); setCol4(s.col4)
    setOptGap(s.optGap); setBubbleR(s.bubbleR)
    setMode(s.mode as '180Q' | '200Q'); setSectionARows(s.sectionARows)
    setStartY(s.startY); setEndY(s.endY)
    setSecAStartY(s.secAStartY); setSecAEndY(s.secAEndY)
    setSecBStartY(s.secBStartY); setSecBEndY(s.secBEndY)
    setGlobalYOffset(s.globalYOffset ?? 0)
    setCol1Y(s.col1Y ?? 0); setCol2Y(s.col2Y ?? 0); setCol3Y(s.col3Y ?? 0); setCol4Y(s.col4Y ?? 0)
    setFillThreshold(s.fillThreshold ?? 20); setMinDifference(s.minDifference ?? 15)
    setShowPresetPanel(false)
  }, [])

  const savePreset = useCallback(() => {
    if (!presetName.trim()) { alert('Please enter a preset name'); return }
    setPresets(p => [...p, { name: presetName.trim(), createdAt: new Date().toISOString(), settings: getAllSettings() }])
    setPresetName('')
    alert('Preset saved!')
  }, [presetName, getAllSettings])

  const exportPreset = useCallback((p: Preset) => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `omr-preset-${p.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const importAndApply = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const p = JSON.parse(ev.target!.result as string) as Preset
        if (p.settings) { applySettings(p.settings); alert('Settings applied!') }
        else alert('Invalid settings file')
      } catch { alert('Failed to parse settings file') }
    }
    reader.readAsText(f)
    e.target.value = ''
  }, [applySettings])

  const scan = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    setResult(null)

    const settings: any = {
      rect: { x: rectX, y: rectY, w: rectW, h: rectH },
      cols: [col1, col2, col3, col4],
      optGap, bubbleR, mode, sectionARows,
      fillThreshold: fillThreshold / 100,
      minDifference: minDifference / 100,
      colOffsets: [globalYOffset + col1Y, globalYOffset + col2Y, globalYOffset + col3Y, globalYOffset + col4Y]
    }

    if (mode === '180Q') {
      settings.startY = startY
      settings.endY = endY
    } else {
      settings.secAStartY = secAStartY
      settings.secAEndY = secAEndY
      settings.secBStartY = secBStartY
      settings.secBEndY = secBEndY
    }

    try {
      const result = await processOMR(file, settings)
      setResult(result)
    } catch (e) {
      setResult({ success: false, error: String(e) })
    } finally {
      setProcessing(false)
    }
  }, [file, rectX, rectY, rectW, rectH, col1, col2, col3, col4, optGap, bubbleR, mode, sectionARows,
      fillThreshold, minDifference, globalYOffset, col1Y, col2Y, col3Y, col4Y, startY, endY,
      secAStartY, secAEndY, secBStartY, secBEndY])

  const confirmAndImport = useCallback(() => {
    if (!result?.success || !result.data?.answers) return
    const answersArray: string[] = []
    const total = mode === '200Q' ? (NUM_COLS * TOTAL_ROWS) : 180
    for (let i = 1; i <= total; i++) {
      const ans = result.data.answers[String(i)]
      answersArray.push(!ans || ans === 'INVALID' ? '0' : ans)
    }
    onAnswersDetected(answersArray)
    // Keep the dialog open - don't call onOpenChange(false)
  }, [result, mode, onAnswersDetected])

  const reset = useCallback(() => {
    setFile(null); setImage(null); setImgSize(null); setResult(null)
  }, [])

  const resetOffsets = useCallback(() => {
    setGlobalYOffset(0); setCol1Y(0); setCol2Y(0); setCol3Y(0); setCol4Y(0)
  }, [])

  const COL_BG = ['border-sky-400/70 bg-sky-400/25', 'border-amber-400/70 bg-amber-400/25', 
                  'border-emerald-400/70 bg-emerald-400/25', 'border-rose-400/70 bg-rose-400/25']

  const bubbleData = useMemo(() => {
    if (!imgSize) return []
    const data: { x: number; y: number; type: 'a' | 'b' | 'n'; ci: number }[] = []
    
    for (let ci = 0; ci < NUM_COLS; ci++) {
      for (let ri = 0; ri < TOTAL_ROWS; ri++) {
        for (let oi = 0; oi < OPTIONS; oi++) {
          const absX = cols[ci] + oi * optGap
          const absY = getRowY(ci, ri)
          const type = mode === '200Q' 
            ? (ri < sectionARows ? 'a' : 'b') 
            : 'n'
          data.push({ x: absX, y: absY, type, ci })
        }
      }
    }
    return data
  }, [imgSize, cols, optGap, getRowY, mode, sectionARows])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[95vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-3 border-b bg-background flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold">OMR Scanner ({mode})</DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowPresetPanel(!showPresetPanel)}>
                  <FolderOpen className="w-4 h-4 mr-1"/>Presets
                </Button>
                {image && (
                  <Button size="sm" variant="ghost" onClick={reset}>
                    <RotateCcw className="w-4 h-4 mr-1"/>Reset
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Image Preview */}
            <div className="flex-1 p-3 overflow-auto flex justify-center bg-muted/30 min-h-0">
              {!image ? (
                <div className="w-full max-w-sm p-10 border-2 border-dashed rounded-xl bg-background text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center justify-center my-auto"
                     onClick={() => fileRef.current?.click()}>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" 
                         onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
                  <Upload className="w-14 h-14 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Upload OMR Sheet</h3>
                  <p className="text-sm text-muted-foreground mt-2">Click to upload</p>
                </div>
              ) : (
                <div className="relative inline-block my-4">
                  <img ref={imgRef} src={image} alt="OMR" className="max-w-full h-auto" draggable={false} />
                  
                  {imgSize && (
                    <div className="absolute border-2 border-primary/80 bg-primary/5 pointer-events-none"
                         style={{ left: rectX * scale, top: rectY * scale, width: rectW * scale, height: rectH * scale }}>
                      
                      <div className="absolute inset-0 overflow-hidden">
                        {bubbleData.map((b, i) => (
                          <div
                            key={i}
                            className={`absolute rounded-full ${
                              b.type === 'a' ? 'border-emerald-400/70 bg-emerald-400/20' :
                              b.type === 'b' ? 'border-blue-400/70 bg-blue-400/20' :
                              COL_BG[b.ci]
                            }`}
                            style={{
                              left: b.x * scale,
                              top: b.y * scale,
                              width: bubbleR * 2 * scale,
                              height: bubbleR * 2 * scale,
                              transform: 'translate(-50%, -50%)',
                              borderWidth: 1
                            }}
                          />
                        ))}
                      </div>
                      
                      {mode === '200Q' && (
                        <div className="absolute w-full border-t-2 border-dashed border-red-500/80 pointer-events-none"
                             style={{ top: ((getRowY(0, sectionARows - 1) + getRowY(0, sectionARows)) / 2) * scale }} />
                      )}
                      
                      {mode === '180Q' ? (
                        <>
                          <div className="absolute w-3 h-3 bg-green-500 rounded-full" 
                               style={{ left: -6, top: startY * scale, transform: 'translateY(-50%)' }} />
                          <div className="absolute w-3 h-3 bg-red-500 rounded-full" 
                               style={{ left: -6, top: endY * scale, transform: 'translateY(-50%)' }} />
                        </>
                      ) : (
                        <>
                          <div className="absolute w-3 h-3 bg-emerald-500 rounded-full" 
                               style={{ left: -6, top: secAStartY * scale, transform: 'translateY(-50%)' }} />
                          <div className="absolute w-3 h-3 bg-emerald-500 rounded-full" 
                               style={{ left: -6, top: secAEndY * scale, transform: 'translateY(-50%)' }} />
                          <div className="absolute w-3 h-3 bg-blue-500 rounded-full" 
                               style={{ left: -12, top: secBStartY * scale, transform: 'translateY(-50%)' }} />
                          <div className="absolute w-3 h-3 bg-blue-500 rounded-full" 
                               style={{ left: -12, top: secBEndY * scale, transform: 'translateY(-50%)' }} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="w-full lg:w-80 bg-background border-t lg:border-l flex flex-col min-h-0 max-h-[50vh] lg:max-h-none">
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  
                  {/* Presets Panel */}
                  {showPresetPanel && (
                    <div className="border rounded-lg p-2 bg-muted/50">
                      <h3 className="text-xs font-semibold mb-2">Save/Load Presets</h3>
                      <div className="flex gap-2 mb-2">
                        <input type="text" placeholder="Name..." value={presetName} 
                               onChange={e => setPresetName(e.target.value)} 
                               className="flex-1 border rounded px-2 py-1 text-xs" />
                        <Button size="sm" onClick={savePreset} className="h-7">
                          <Save className="w-3 h-3"/>
                        </Button>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <Button size="sm" variant="outline" 
                                onClick={() => exportPreset({ name: 'current', createdAt: new Date().toISOString(), settings: getAllSettings() })}
                                className="flex-1 h-7 text-xs">
                          <Download className="w-3 h-3 mr-1"/>Export
                        </Button>
                        <input ref={presetImportRef} type="file" accept=".json" className="hidden" onChange={importAndApply} />
                        <Button size="sm" variant="outline" onClick={() => presetImportRef.current?.click()}
                                className="flex-1 h-7 text-xs">
                          <Upload className="w-3 h-3 mr-1"/>Import
                        </Button>
                      </div>
                      {presets.length > 0 && (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {presets.map((p, i) => (
                            <div key={i} className="flex items-center gap-1 bg-background rounded p-1.5 text-xs">
                              <button onClick={() => applySettings(p.settings)} 
                                      className="flex-1 text-left hover:text-primary truncate">{p.name}</button>
                              <button onClick={() => exportPreset(p)} className="p-1 hover:bg-muted rounded">
                                <Download className="w-3 h-3 text-muted-foreground"/>
                              </button>
                              <button onClick={() => { if (confirm('Delete?')) setPresets(presets.filter((_, j) => j !== i)) }} 
                                      className="p-1 hover:bg-destructive/10 rounded">
                                <Trash2 className="w-3 h-3 text-destructive"/>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {image && imgSize && (
                    <>
                      {/* Mode Selection */}
                      <div className="bg-muted/50 rounded-lg p-2">
                        <h3 className="text-xs font-semibold mb-1.5">OMR Mode</h3>
                        <div className="flex gap-2">
                          {(['180Q', '200Q'] as const).map(m => (
                            <button key={m} onClick={() => handleModeChange(m)}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                                      mode === m 
                                        ? 'bg-primary text-primary-foreground border-primary' 
                                        : 'bg-background border-muted hover:border-primary/50'
                                    }`}>{m}</button>
                          ))}
                        </div>
                        {mode === '200Q' && (
                          <div className="mt-2">
                            <LabeledSlider label="Section A Rows" value={sectionARows} 
                                           onChange={setSectionARows} min={10} max={44} />
                            <p className="text-[8px] text-muted-foreground mt-1">
                              Section A: Q1-Q{sectionARows} | Section B: Q{sectionARows + 1}-Q{TOTAL_ROWS}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Selection Rectangle */}
                      <div className="bg-muted/50 rounded-lg p-2">
                        <button type="button" onClick={() => toggleSection('rect')} 
                                className="flex items-center justify-between w-full text-left">
                          <h3 className="text-xs font-semibold">Selection Rectangle</h3>
                          {expandedSections.rect ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {expandedSections.rect && (
                          <div className="grid grid-cols-2 gap-2 mt-1.5">
                            <LabeledSlider label="X" value={rectX} onChange={setRectX} min={0} max={imgSize.w} />
                            <LabeledSlider label="Y" value={rectY} onChange={setRectY} min={0} max={imgSize.h} />
                            <LabeledSlider label="Width" value={rectW} onChange={setRectW} min={50} max={imgSize.w} />
                            <LabeledSlider label="Height" value={rectH} onChange={setRectH} min={50} max={imgSize.h} />
                          </div>
                        )}
                      </div>

                      {/* Column Positions */}
                      <div className="bg-muted/50 rounded-lg p-2">
                        <button type="button" onClick={() => toggleSection('cols')} 
                                className="flex items-center justify-between w-full text-left">
                          <h3 className="text-xs font-semibold">Column X Positions</h3>
                          {expandedSections.cols ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {expandedSections.cols && (
                          <div className="space-y-1 mt-1.5">
                            <ColumnSlider value={col1} onChange={setCol1} idx={0} maxVal={rectW} />
                            <ColumnSlider value={col2} onChange={setCol2} idx={1} maxVal={rectW} />
                            <ColumnSlider value={col3} onChange={setCol3} idx={2} maxVal={rectW} />
                            <ColumnSlider value={col4} onChange={setCol4} idx={3} maxVal={rectW} />
                          </div>
                        )}
                      </div>

                      {/* 180Q Mode */}
                      {mode === '180Q' && (
                        <div className="bg-muted/50 rounded-lg p-2">
                          <h3 className="text-xs font-semibold mb-1.5">Row Calibration (All 45 rows)</h3>
                          <div className="space-y-1">
                            <LabeledSlider label="Start Y (row 1)" value={startY} onChange={setStartY} 
                                           min={0} max={rectH} colorClass="text-green-600" />
                            <LabeledSlider label="End Y (row 45)" value={endY} onChange={setEndY} 
                                           min={0} max={rectH} colorClass="text-red-600" />
                          </div>
                        </div>
                      )}

                      {/* 200Q Mode */}
                      {mode === '200Q' && (
                        <>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                            <h3 className="text-xs font-semibold text-emerald-700 mb-1.5">
                              Section A (Q1-Q{sectionARows})
                            </h3>
                            <div className="space-y-1">
                              <LabeledSlider label="Start Y (row 1)" value={secAStartY} onChange={setSecAStartY} 
                                             min={0} max={rectH} colorClass="text-emerald-600" />
                              <LabeledSlider label={`End Y (row ${sectionARows})`} value={secAEndY} onChange={setSecAEndY} 
                                             min={0} max={rectH} colorClass="text-emerald-600" />
                            </div>
                          </div>

                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                            <h3 className="text-xs font-semibold text-blue-700 mb-1.5">
                              Section B (Q{sectionARows + 1}-Q{TOTAL_ROWS})
                            </h3>
                            <div className="space-y-1">
                              <LabeledSlider label={`Start Y (row ${sectionARows + 1})`} value={secBStartY} onChange={setSecBStartY} 
                                             min={0} max={rectH} colorClass="text-blue-600" />
                              <LabeledSlider label="End Y (row 45)" value={secBEndY} onChange={setSecBEndY} 
                                             min={0} max={rectH} colorClass="text-blue-600" />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Column Y Offsets */}
                      <div className="bg-muted/50 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <button type="button" onClick={() => toggleSection('offsets')} 
                                  className="flex items-center justify-between flex-1 text-left">
                            <h3 className="text-xs font-semibold">Column Y Offsets</h3>
                            {expandedSections.offsets ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <button onClick={resetOffsets} 
                                  className="text-[9px] text-muted-foreground hover:text-destructive underline ml-2">Reset</button>
                        </div>
                        {expandedSections.offsets && (
                          <div className="mt-1.5 space-y-1">
                            <LabeledSlider label="Global Shift" value={globalYOffset} 
                                           onChange={setGlobalYOffset} min={-200} max={200} />
                            <OffsetSlider value={col1Y} onChange={setCol1Y} idx={0} />
                            <OffsetSlider value={col2Y} onChange={setCol2Y} idx={1} />
                            <OffsetSlider value={col3Y} onChange={setCol3Y} idx={2} />
                            <OffsetSlider value={col4Y} onChange={setCol4Y} idx={3} />
                          </div>
                        )}
                      </div>

                      {/* Bubble Size */}
                      <div className="bg-muted/50 rounded-lg p-2">
                        <h3 className="text-xs font-semibold mb-1.5">Bubble Settings</h3>
                        <div className="space-y-1">
                          <LabeledSlider label="Option Gap" value={optGap} onChange={setOptGap} min={5} max={100} />
                          <LabeledSlider label="Bubble Radius" value={bubbleR} onChange={setBubbleR} min={3} max={50} />
                        </div>
                      </div>

                      {/* Detection Sensitivity */}
                      <div className="bg-muted/50 rounded-lg p-2">
                        <button type="button" onClick={() => toggleSection('detection')} 
                                className="flex items-center justify-between w-full text-left">
                          <h3 className="text-xs font-semibold">Detection Sensitivity</h3>
                          {expandedSections.detection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {expandedSections.detection && (
                          <div className="space-y-1 mt-1.5">
                            <LabeledSlider label="Fill Threshold (%)" value={fillThreshold} 
                                           onChange={setFillThreshold} min={5} max={50} />
                            <LabeledSlider label="Min Difference (%)" value={minDifference} 
                                           onChange={setMinDifference} min={5} max={40} />
                          </div>
                        )}
                      </div>

                      {/* Results */}
                      {result && !result.success && (
                        <div className="border border-destructive/30 bg-destructive/10 rounded-lg p-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-destructive"/>
                          <span className="text-destructive text-xs">{result.error}</span>
                        </div>
                      )}

                      {result?.success && (
                        <>
                          <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1.5">
                              <CheckCircle2 className="w-4 h-4 text-green-600"/>
                              <span className="font-semibold text-xs">Detected: {result.data.statistics.answered} answers</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                              <div className="bg-green-500/20 rounded p-1"><p className="font-bold text-green-700">{result.data.statistics.answered}</p><p>Answered</p></div>
                              <div className="bg-amber-500/20 rounded p-1"><p className="font-bold text-amber-700">{result.data.statistics.unanswered}</p><p>Empty</p></div>
                              <div className="bg-red-500/20 rounded p-1"><p className="font-bold text-red-700">{result.data.statistics.invalid}</p><p>Invalid</p></div>
                              <div className="bg-muted rounded p-1"><p className="font-bold">{result.data.statistics.total_questions}</p><p>Total</p></div>
                            </div>
                          </div>
                          <div className="rounded-lg overflow-hidden border">
                            <div className="flex items-center justify-between bg-muted p-1">
                              <p className="text-[10px] text-muted-foreground">Annotated result (scroll to zoom, drag to pan)</p>
                            </div>
                            <ZoomableImage src={result.annotatedImage} alt="Annotated Result" />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Buttons */}
              {image && imgSize && (
                <div className="border-t p-3 bg-background flex-shrink-0">
                  {!result?.success ? (
                    <Button size="lg" className="w-full font-bold" onClick={scan} disabled={processing}>
                      {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Scanning...</> : <><Play className="w-4 h-4 mr-2"/>SCAN</>}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="lg" variant="outline" className="flex-1 font-bold" onClick={scan} disabled={processing}>
                        {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Scanning...</> : <><RotateCcw className="w-4 h-4 mr-2"/>Rescan</>}
                      </Button>
                      <Button size="lg" className="flex-1 font-bold bg-green-600 hover:bg-green-700" onClick={confirmAndImport}>
                        <CheckCircle2 className="w-4 h-4 mr-2"/>Import
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
  )
}
