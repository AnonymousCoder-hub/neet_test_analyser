import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for canvas package
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Settings {
  rect: { x: number; y: number; w: number; h: number };
  cols: number[];
  optGap: number;
  bubbleR: number;
  mode: '180Q' | '200Q';
  sectionARows: number;
  fillThreshold: number;
  minDifference: number;
  colOffsets: number[];
  startY?: number;
  endY?: number;
  secAStartY?: number;
  secAEndY?: number;
  secBStartY?: number;
  secBEndY?: number;
}

function getFillRatio(
  imageData: ImageData,
  imgWidth: number,
  imgHeight: number,
  x: number,
  y: number,
  r: number
): number {
  const centerX = Math.round(x);
  const centerY = Math.round(y);
  const radius = Math.max(1, Math.round(r));

  const clampedX = Math.max(radius, Math.min(imgWidth - radius - 1, centerX));
  const clampedY = Math.max(radius, Math.min(imgHeight - radius - 1, centerY));

  let totalPixels = 0;
  let totalDarkness = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const px = clampedX + dx;
        const py = clampedY + dy;

        if (px >= 0 && px < imgWidth && py >= 0 && py < imgHeight) {
          const idx = (py * imgWidth + px) * 4;
          const red = imageData.data[idx];
          const green = imageData.data[idx + 1];
          const blue = imageData.data[idx + 2];
          const gray = 0.299 * red + 0.587 * green + 0.114 * blue;
          totalDarkness += (255 - gray) / 255;
          totalPixels++;
        }
      }
    }
  }

  if (totalPixels === 0) return 0;
  return totalDarkness / totalPixels;
}

function getRowY(startY: number, endY: number, rowIndex: number, totalRows: number): number {
  if (totalRows <= 1) return startY;
  return startY + (endY - startY) * (rowIndex / (totalRows - 1));
}

export async function POST(request: NextRequest) {
  try {
    // Dynamically import canvas - may not be available on all platforms
    let createCanvas: any, loadImage: any;
    try {
      const canvasModule = await import('canvas');
      createCanvas = canvasModule.createCanvas;
      loadImage = canvasModule.loadImage;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'OMR scanning is not available on this platform. The canvas package is required but not installed. Please use Manual or OMR input mode instead.',
        },
        { status: 501 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const settingsStr = formData.get('settings') as string;

    if (!file || !settingsStr) {
      return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 });
    }

    const settings: Settings = JSON.parse(settingsStr);
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
    } = settings;

    const is200Q = mode === '200Q';
    const QUESTIONS_PER_COL = 45;
    const NUM_COLS = cols.length;
    const MIN_FILL = fillThreshold ?? 0.20;
    const MIN_DIFF = minDifference ?? 0.15;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const img = await loadImage(buffer);

    const imgWidth = img.width;
    const imgHeight = img.height;

    const canvas = createCanvas(imgWidth, imgHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, imgWidth, imgHeight);

    const outputCanvas = createCanvas(imgWidth, imgHeight);
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.drawImage(img, 0, 0);

    const getY = (ci: number, row: number): number => {
      const offset = colOffsets[ci] ?? 0;

      if (!is200Q) {
        const startY = settings.startY ?? 0;
        const endY = settings.endY ?? rect.h;
        return getRowY(startY, endY, row, QUESTIONS_PER_COL) + offset;
      }

      if (row < sectionARows) {
        const startY = settings.secAStartY ?? 0;
        const endY = settings.secAEndY ?? rect.h;
        return getRowY(startY, endY, row, sectionARows) + offset;
      } else {
        const bRow = row - sectionARows;
        const bTotal = QUESTIONS_PER_COL - sectionARows;
        const startY = settings.secBStartY ?? 0;
        const endY = settings.secBEndY ?? rect.h;
        return getRowY(startY, endY, bRow, bTotal) + offset;
      }
    };

    const answers: Record<string, string | null> = {};
    const stats = { answered: 0, unanswered: 0, invalid: 0 };

    outputCtx.fillStyle = 'rgb(180, 180, 180)';
    for (let ci = 0; ci < NUM_COLS; ci++) {
      for (let row = 0; row < QUESTIONS_PER_COL; row++) {
        for (let opt = 0; opt < 4; opt++) {
          const absX = rect.x + cols[ci] + opt * optGap;
          const absY = rect.y + getY(ci, row);
          outputCtx.beginPath();
          outputCtx.arc(absX, absY, 2, 0, Math.PI * 2);
          outputCtx.fill();
        }
      }
    }

    if (is200Q) {
      outputCtx.strokeStyle = 'rgb(255, 100, 100)';
      outputCtx.lineWidth = 2;
      outputCtx.setLineDash([8, 8]);
      
      for (let ci = 0; ci < NUM_COLS; ci++) {
        const dividerY = (getY(ci, sectionARows - 1) + getY(ci, sectionARows)) / 2;
        outputCtx.beginPath();
        outputCtx.moveTo(rect.x + cols[ci] - 10, rect.y + dividerY);
        outputCtx.lineTo(rect.x + cols[ci] + 4 * optGap + 10, rect.y + dividerY);
        outputCtx.stroke();
      }
      outputCtx.setLineDash([]);
    }

    for (let ci = 0; ci < NUM_COLS; ci++) {
      for (let row = 0; row < QUESTIONS_PER_COL; row++) {
        const q = ci * QUESTIONS_PER_COL + row + 1;
        const ratios: number[] = [];
        const coords: { x: number; y: number }[] = [];

        for (let opt = 0; opt < 4; opt++) {
          const absX = rect.x + cols[ci] + opt * optGap;
          const absY = rect.y + getY(ci, row);

          const ratio = getFillRatio(imageData, imgWidth, imgHeight, absX, absY, bubbleR);
          ratios.push(ratio);
          coords.push({ x: Math.round(absX), y: Math.round(absY) });
        }

        const sorted = ratios
          .map((r, i) => ({ ratio: r, index: i }))
          .sort((a, b) => b.ratio - a.ratio);

        const maxRatio = sorted[0].ratio;
        const maxIndex = sorted[0].index;
        const baseline = (sorted[1].ratio + sorted[2].ratio + sorted[3].ratio) / 3;
        const gap = maxRatio - baseline;

        if (maxRatio < MIN_FILL) {
          answers[String(q)] = null;
          stats.unanswered++;
        } else if (gap >= MIN_DIFF) {
          answers[String(q)] = String(maxIndex + 1);
          stats.answered++;
          outputCtx.strokeStyle = 'rgb(0, 255, 0)';
          outputCtx.lineWidth = 2;
          outputCtx.beginPath();
          outputCtx.arc(coords[maxIndex].x, coords[maxIndex].y, bubbleR + 3, 0, Math.PI * 2);
          outputCtx.stroke();
        } else if (gap >= MIN_DIFF * 0.4 && maxRatio > MIN_FILL * 1.8) {
          answers[String(q)] = String(maxIndex + 1);
          stats.answered++;
          outputCtx.strokeStyle = 'rgb(255, 180, 0)';
          outputCtx.lineWidth = 2;
          outputCtx.beginPath();
          outputCtx.arc(coords[maxIndex].x, coords[maxIndex].y, bubbleR + 3, 0, Math.PI * 2);
          outputCtx.stroke();
        } else {
          answers[String(q)] = null;
          stats.unanswered++;
        }
      }
    }

    outputCtx.strokeStyle = 'rgb(16, 185, 129)';
    outputCtx.lineWidth = 2;
    outputCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    outputCtx.strokeStyle = 'rgb(200, 200, 0)';
    outputCtx.lineWidth = 1;
    for (let ci = 0; ci < NUM_COLS; ci++) {
      const x = rect.x + cols[ci];
      outputCtx.beginPath();
      outputCtx.moveTo(x, rect.y);
      outputCtx.lineTo(x, rect.y + rect.h);
      outputCtx.stroke();
    }

    if (is200Q) {
      outputCtx.fillStyle = 'rgb(0, 200, 0)';
      for (let ci = 0; ci < NUM_COLS; ci++) {
        const x = rect.x + cols[ci];
        const offset = colOffsets[ci] ?? 0;
        outputCtx.beginPath();
        outputCtx.arc(x, rect.y + (settings.secAStartY ?? 0) + offset, 4, 0, Math.PI * 2);
        outputCtx.fill();
        outputCtx.beginPath();
        outputCtx.arc(x, rect.y + (settings.secAEndY ?? rect.h) + offset, 4, 0, Math.PI * 2);
        outputCtx.fill();
      }

      outputCtx.fillStyle = 'rgb(100, 100, 255)';
      for (let ci = 0; ci < NUM_COLS; ci++) {
        const x = rect.x + cols[ci] - 8;
        const offset = colOffsets[ci] ?? 0;
        outputCtx.beginPath();
        outputCtx.arc(x, rect.y + (settings.secBStartY ?? 0) + offset, 4, 0, Math.PI * 2);
        outputCtx.fill();
        outputCtx.beginPath();
        outputCtx.arc(x, rect.y + (settings.secBEndY ?? rect.h) + offset, 4, 0, Math.PI * 2);
        outputCtx.fill();
      }
    } else {
      for (let ci = 0; ci < NUM_COLS; ci++) {
        const x = rect.x + cols[ci];
        const offset = colOffsets[ci] ?? 0;
        outputCtx.fillStyle = 'rgb(0, 200, 0)';
        outputCtx.beginPath();
        outputCtx.arc(x, rect.y + (settings.startY ?? 0) + offset, 4, 0, Math.PI * 2);
        outputCtx.fill();
        outputCtx.fillStyle = 'rgb(0, 0, 200)';
        outputCtx.beginPath();
        outputCtx.arc(x, rect.y + (settings.endY ?? rect.h) + offset, 4, 0, Math.PI * 2);
        outputCtx.fill();
      }
    }

    const annotatedImage = outputCanvas.toBuffer('image/jpeg').toString('base64');

    return NextResponse.json({
      success: true,
      data: {
        answers,
        statistics: {
          ...stats,
          total_questions: NUM_COLS * QUESTIONS_PER_COL,
        },
      },
      annotatedImage: `data:image/jpeg;base64,${annotatedImage}`,
      processor: 'javascript',
      processorInfo: is200Q
        ? `200Q dual-section mode (Section A: Q1-Q${sectionARows}, Section B: Q${sectionARows + 1}-Q${QUESTIONS_PER_COL})`
        : '180Q standard mode',
    });
  } catch (error) {
    console.error('OMR processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
