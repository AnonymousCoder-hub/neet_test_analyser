import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    let records;
    if (userId) {
      records = await db.testRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      records = await db.testRecord.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching test records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      markedAnswers,
      correctAnswers,
      totalMarks,
      percentage,
      physicsScore,
      chemistryScore,
      botanyScore,
      zoologyScore,
    } = body;

    const testRecord = await db.testRecord.create({
      data: {
        userId,
        markedAnswers,
        correctAnswers,
        totalMarks,
        percentage,
        physicsScore,
        chemistryScore,
        botanyScore,
        zoologyScore,
      },
    });

    return NextResponse.json(testRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating test record:', error);
    return NextResponse.json(
      { error: 'Failed to create test record' },
      { status: 500 }
    );
  }
}
