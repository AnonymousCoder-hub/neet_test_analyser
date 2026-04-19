import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, getTokenFromHeaders, hashPassword } from '@/lib/auth'

// GET - Admin: List all users with their test counts
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
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Query users
    let query = supabase
      .from('users')
      .select('id, username, role, security_token, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('username', `%${search}%`)
    }

    const { data: users, error, count } = await query

    if (error) {
      console.error('Admin fetch users error:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get test counts for each user
    const usersWithCounts = await Promise.all(
      (users || []).map(async (u: any) => {
        const { count } = await supabase
          .from('test_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id)
        return { ...u, testCount: count || 0 }
      })
    )

    return NextResponse.json({
      users: usersWithCounts,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('Admin fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Admin: Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Admin delete user error:', error)
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Admin delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
