import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'

// GET - Admin: Get test records for a specific user
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { data: records, error } = await supabase
      .from('test_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Admin fetch records error:', error)
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    // Also get user info
    const { data: userData } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      user: userData,
      records: records || [],
    })
  } catch (error) {
    console.error('Admin records error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
