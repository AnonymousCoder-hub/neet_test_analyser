/**
 * Client-side OMR (Optical Mark Recognition) processor
 * Uses the browser's native Canvas API instead of node-canvas
 * This works on all platforms including Vercel serverless functions
 */

interface OMRSettings {
  rect: { x: number; y: number; w: number; h: number }
  cols: number[]
  optGap: number
  bubbleR: number
  mode: '180Q' | '200Q'
  sectionARows: number
  fillThreshold: number
  minDifference: number
  colOffsets: number[]
  startY?: number
  endY?: number
  secAStartY?: number
  secAEndY?: number
  secBStartY?: number
  secBEndY?: number
}

interface OMRResult {
  success: boolean
  data?: {
    answers: Record<string, string | null>
    statistics: {
      answered: number
      unanswered: number
      invalid: number
      total_questions: number
    }
  }
  annotatedImage?: string
  processor?: string
  processorInfo?: string
  error?: string
}

function getRowY(
  startY: number,
  endY: number,
  rowIndex: number,
  totalRows: number
): number {
  if (totalRows <= 1) return startY
  return startY + (endY - startY) * (rowIndex / (totalRows - 1))
}

function getFillRatio(
  imageData: ImageData,
  imgWidth: number,
  _imgHeight: number,
  x: number,
  y: number,
  r: number
): number {
  const centerX = Math.round(x)
  const centerY = Math.round(y)
  const radius = Math.max(1, Math.round(r))

  const clampedX = Math.max(radius, Math.min(imgWidth - radius - 1, centerX))
  const clampedY = Math.max(radius, Math.min(imageData.height - radius - 1, centerY))

  let totalPixels = 0
  let totalDarkness = 0

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const px = clampedX + dx
        const py = clampedY + dy

        if (px >= 0 && px < imgWidth && py >= 0 && py < imageData.height) {
          const idx = (py * imgWidth + px) * 4
          const red = imageData.data[idx]
          const green = imageData.data[idx + 1]
          const blue = imageData.data[idx + 2]
          const gray = 0.299 * red + 0.587 * green + 0.114 * blue
          totalDarkness += (255 - gray) / 255
          totalPixels++
        }
      }
    }
  }

  if (totalPixels === 0) return 0
  return totalDarkness / totalPixels
}

export async function processOMR(
  imageFile: File,
  settings: OMRSettings
): Promise<OMRResult> {
  try {
    // Load image into browser canvas
    const img = await loadImageFromFile(imageFile)

    const imgWidth = img.width
    const imgHeight = img.height

    // Create canvas and draw image
    const canvas = document.createElement('canvas')
    canvas.width = imgWidth
    canvas.height = imgHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, imgWidth, imgHeight)

    // Create output canvas for annotations
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = imgWidth
    outputCanvas.height = imgHeight
    const outputCtx = outputCanvas.getContext('2d')!
    outputCtx.drawImage(img, 0, 0)

    const {
      rect,
      cols,
      optGap,
      bubbleR,
      mode,
      sectionARows,
      fillThreshold,
      minDifference,
      colOffsets,
    } = settings

    const is200Q = mode === '200Q'
    const QUESTIONS_PER_COL = 45
    const NUM_COLS = cols.length
    const MIN_FILL = fillThreshold ?? 0.20
    const MIN_DIFF = minDifference ?? 0.15

    const getY = (ci: number, row: number): number => {
      const offset = colOffsets[ci] ?? 0

      if (!is200Q) {
        const sY = settings.startY ?? 0
        const eY = settings.endY ?? rect.h
        return getRowY(sY, eY, row, QUESTIONS_PER_COL) + offset
      }

      if (row < sectionARows) {
        const sY = settings.secAStartY ?? 0
        const eY = settings.secAEndY ?? rect.h
        return getRowY(sY, eY, row, sectionARows) + offset
      } else {
        const bRow = row - sectionARows
        const bTotal = QUESTIONS_PER_COL - sectionARows
        const sY = settings.secBStartY ?? 0
        const eY = settings.secBEndY ?? rect.h
        return getRowY(sY, eY, bRow, bTotal) + offset
      }
    }

    const answers: Record<string, string | null> = {}
    const stats = { answered: 0, unanswered: 0, invalid: 0 }

    // Draw calibration dots
    outputCtx.fillStyle = 'rgb(180, 180, 180)'
    for (let ci = 0; ci < NUM_COLS; ci++) {
      for (let row = 0; row < QUESTIONS_PER_COL; row++) {
        for (let opt = 0; opt < 4; opt++) {
          const absX = rect.x + cols[ci] + opt * optGap
          const absY = rect.y + getY(ci, row)
          outputCtx.beginPath()
          outputCtx.arc(absX, absY, 2, 0, Math.PI * 2)
          outputCtx.fill()
        }
      }
    }

    // Draw section divider for 200Q mode
    if (is200Q) {
      outputCtx.strokeStyle = 'rgb(255, 100, 100)'
      outputCtx.lineWidth = 2
      outputCtx.setLineDash([8, 8])

      for (let ci = 0; ci < NUM_COLS; ci++) {
        const dividerY =
          (getY(ci, sectionARows - 1) + getY(ci, sectionARows)) / 2
        outputCtx.beginPath()
        outputCtx.moveTo(rect.x + cols[ci] - 10, rect.y + dividerY)
        outputCtx.lineTo(rect.x + cols[ci] + 4 * optGap + 10, rect.y + dividerY)
        outputCtx.stroke()
      }
      outputCtx.setLineDash([])
    }

    // Process each bubble
    for (let ci = 0; ci < NUM_COLS; ci++) {
      for (let row = 0; row < QUESTIONS_PER_COL; row++) {
        const q = ci * QUESTIONS_PER_COL + row + 1
        const ratios: number[] = []
        const coords: { x: number; y: number }[] = []

        for (let opt = 0; opt < 4; opt++) {
          const absX = rect.x + cols[ci] + opt * optGap
          const absY = rect.y + getY(ci, row)

          const ratio = getFillRatio(imageData, imgWidth, imgHeight, absX, absY, bubbleR)
          ratios.push(ratio)
          coords.push({ x: Math.round(absX), y: Math.round(absY) })
        }

        const sorted = ratios
          .map((r, i) => ({ ratio: r, index: i }))
          .sort((a, b) => b.ratio - a.ratio)

        const maxRatio = sorted[0].ratio
        const maxIndex = sorted[0].index
        const baseline =
          (sorted[1].ratio + sorted[2].ratio + sorted[3].ratio) / 3
        const gap = maxRatio - baseline

        if (maxRatio < MIN_FILL) {
          answers[String(q)] = null
          stats.unanswered++
        } else if (gap >= MIN_DIFF) {
          answers[String(q)] = String(maxIndex + 1)
          stats.answered++
          outputCtx.strokeStyle = 'rgb(0, 255, 0)'
          outputCtx.lineWidth = 2
          outputCtx.beginPath()
          outputCtx.arc(
            coords[maxIndex].x,
            coords[maxIndex].y,
            bubbleR + 3,
            0,
            Math.PI * 2
          )
          outputCtx.stroke()
        } else if (gap >= MIN_DIFF * 0.4 && maxRatio > MIN_FILL * 1.8) {
          answers[String(q)] = String(maxIndex + 1)
          stats.answered++
          outputCtx.strokeStyle = 'rgb(255, 180, 0)'
          outputCtx.lineWidth = 2
          outputCtx.beginPath()
          outputCtx.arc(
            coords[maxIndex].x,
            coords[maxIndex].y,
            bubbleR + 3,
            0,
            Math.PI * 2
          )
          outputCtx.stroke()
        } else {
          answers[String(q)] = null
          stats.unanswered++
        }
      }
    }

    // Draw selection rectangle
    outputCtx.strokeStyle = 'rgb(16, 185, 129)'
    outputCtx.lineWidth = 2
    outputCtx.strokeRect(rect.x, rect.y, rect.w, rect.h)

    // Draw column lines
    outputCtx.strokeStyle = 'rgb(200, 200, 0)'
    outputCtx.lineWidth = 1
    for (let ci = 0; ci < NUM_COLS; ci++) {
      const x = rect.x + cols[ci]
      outputCtx.beginPath()
      outputCtx.moveTo(x, rect.y)
      outputCtx.lineTo(x, rect.y + rect.h)
      outputCtx.stroke()
    }

    // Draw start/end markers
    if (is200Q) {
      outputCtx.fillStyle = 'rgb(0, 200, 0)'
      for (let ci = 0; ci < NUM_COLS; ci++) {
        const x = rect.x + cols[ci]
        const offset = colOffsets[ci] ?? 0
        outputCtx.beginPath()
        outputCtx.arc(
          x,
          rect.y + (settings.secAStartY ?? 0) + offset,
          4,
          0,
          Math.PI * 2
        )
        outputCtx.fill()
        outputCtx.beginPath()
        outputCtx.arc(
          x,
          rect.y + (settings.secAEndY ?? rect.h) + offset,
          4,
          0,
          Math.PI * 2
        )
        outputCtx.fill()
      }

      outputCtx.fillStyle = 'rgb(100, 100, 255)'
      for (let ci = 0; ci < NUM_COLS; ci++) {
        const x = rect.x + cols[ci] - 8
        const offset = colOffsets[ci] ?? 0
        outputCtx.beginPath()
        outputCtx.arc(
          x,
          rect.y + (settings.secBStartY ?? 0) + offset,
          4,
          0,
          Math.PI * 2
        )
        outputCtx.fill()
        outputCtx.beginPath()
        outputCtx.arc(
          x,
          rect.y + (settings.secBEndY ?? rect.h) + offset,
          4,
          0,
          Math.PI * 2
        )
        outputCtx.fill()
      }
    } else {
      for (let ci = 0; ci < NUM_COLS; ci++) {
        const x = rect.x + cols[ci]
        const offset = colOffsets[ci] ?? 0
        outputCtx.fillStyle = 'rgb(0, 200, 0)'
        outputCtx.beginPath()
        outputCtx.arc(
          x,
          rect.y + (settings.startY ?? 0) + offset,
          4,
          0,
          Math.PI * 2
        )
        outputCtx.fill()
        outputCtx.fillStyle = 'rgb(0, 0, 200)'
        outputCtx.beginPath()
        outputCtx.arc(
          x,
          rect.y + (settings.endY ?? rect.h) + offset,
          4,
          0,
          Math.PI * 2
        )
        outputCtx.fill()
      }
    }

    // Convert annotated canvas to data URL
    const annotatedImage = outputCanvas.toDataURL('image/jpeg', 0.9)

    return {
      success: true,
      data: {
        answers,
        statistics: {
          ...stats,
          total_questions: NUM_COLS * QUESTIONS_PER_COL,
        },
      },
      annotatedImage,
      processor: 'browser-canvas',
      processorInfo: is200Q
        ? `200Q dual-section mode (Section A: Q1-Q${sectionARows}, Section B: Q${sectionARows + 1}-Q${QUESTIONS_PER_COL})`
        : '180Q standard mode',
    }
  } catch (error) {
    console.error('OMR processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
