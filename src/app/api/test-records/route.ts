import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'

// GET - Fetch user's test records from Supabase
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { data: records, error } = await supabase
      .from('test_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch records error:', error)
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    // Transform to match local format
    const transformed = (records || []).map((r: any) => ({
      id: r.id,
      testName: r.test_name,
      markedAnswers: r.marked_answers,
      correctAnswers: r.correct_answers,
      selectedSubjects: r.selected_subjects,
      notes: r.notes,
      timeSlipEnabled: r.time_slip_enabled,
      timeTaken: r.time_taken,
      timeSlipMinutes: r.time_slip_minutes,
      createdAt: r.created_at,
      // Computed fields (recalculated client-side)
      totalMarks: 0,
      maxMarks: 720,
      percentage: 0,
      physicsMarks: 0,
      chemistryMarks: 0,
      botanyMarks: 0,
      zoologyMarks: 0,
    }))

    return NextResponse.json({ records: transformed })
  } catch (error) {
    console.error('Fetch records error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Sync (upsert) test records to Supabase
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { records } = await request.json()

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: 'Records must be an array' }, { status: 400 })
    }

    // Transform records for Supabase format
    const supabaseRecords = records.map((r: any) => ({
      id: r.id,
      user_id: user.id,
      test_name: r.testName,
      marked_answers: r.markedAnswers,
      correct_answers: r.correctAnswers,
      selected_subjects: r.selectedSubjects || null,
      notes: r.notes || null,
      time_slip_enabled: r.timeSlipEnabled || false,
      time_taken: r.timeTaken || null,
      time_slip_minutes: r.timeSlipMinutes || null,
      created_at: r.createdAt || new Date().toISOString(),
    }))

    // Upsert records
    const { error } = await supabase
      .from('test_records')
      .upsert(supabaseRecords, { onConflict: 'id' })

    if (error) {
      console.error('Sync records error:', error)
      return NextResponse.json({ error: 'Failed to sync records' }, { status: 500 })
    }

    // Delete records that exist in Supabase but not in the sync payload
    const syncedIds = records.map((r: any) => r.id)
    if (syncedIds.length > 0) {
      // Get all records for this user
      const { data: existingRecords } = await supabase
        .from('test_records')
        .select('id')
        .eq('user_id', user.id)

      if (existingRecords) {
        const existingIds = existingRecords.map((r: any) => r.id)
        const idsToDelete = existingIds.filter((id: string) => !syncedIds.includes(id))

        if (idsToDelete.length > 0) {
          await supabase
            .from('test_records')
            .delete()
            .in('id', idsToDelete)
            .eq('user_id', user.id)
        }
      }
    }

    return NextResponse.json({ message: 'Records synced successfully', count: records.length })
  } catch (error) {
    console.error('Sync records error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a single test record
export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { recordId } = await request.json()

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('test_records')
      .delete()
      .eq('id', recordId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Delete record error:', error)
      return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Record deleted successfully' })
  } catch (error) {
    console.error('Delete record error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
