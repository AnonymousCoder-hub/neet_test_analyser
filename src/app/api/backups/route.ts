import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'

// GET - Fetch user's backups from Supabase
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

    const { data: backups, error } = await supabase
      .from('backups')
      .select('id, timestamp, record_count, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Fetch backups error:', error)
      return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
    }

    return NextResponse.json({ backups: backups || [] })
  } catch (error) {
    console.error('Fetch backups error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new backup
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

    const body = await request.json()
    const { id, timestamp, recordCount, data } = body

    if (!id || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // First, check how many backups the user already has
    const { data: existingBackups } = await supabase
      .from('backups')
      .select('id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // If 5 or more, delete the oldest ones
    if (existingBackups && existingBackups.length >= 5) {
      const idsToDelete = existingBackups.slice(4).map((b: any) => b.id)
      if (idsToDelete.length > 0) {
        await supabase
          .from('backups')
          .delete()
          .in('id', idsToDelete)
          .eq('user_id', user.id)
      }
    }

    // Insert the new backup
    const { error } = await supabase
      .from('backups')
      .upsert({
        id,
        user_id: user.id,
        timestamp,
        record_count: recordCount,
        data,
      }, { onConflict: 'id' })

    if (error) {
      console.error('Create backup error:', error)
      return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Backup created successfully', id })
  } catch (error) {
    console.error('Create backup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a backup
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

    const { backupId } = await request.json()

    if (!backupId) {
      return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('backups')
      .delete()
      .eq('id', backupId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Delete backup error:', error)
      return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Backup deleted successfully' })
  } catch (error) {
    console.error('Delete backup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
