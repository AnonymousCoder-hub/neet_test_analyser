import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'

// POST - Get a specific backup's data for restore
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

    const { backupId } = await request.json()

    if (!backupId) {
      return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 })
    }

    const { data: backup, error } = await supabase
      .from('backups')
      .select('id, timestamp, record_count, data')
      .eq('id', backupId)
      .eq('user_id', user.id)
      .single()

    if (error || !backup) {
      console.error('Fetch backup error:', error)
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    return NextResponse.json({ backup })
  } catch (error) {
    console.error('Fetch backup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
