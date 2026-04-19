import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Fetch additional user data from Supabase (including security_token)
    const { data: userData } = await supabase
      .from('users')
      .select('id, username, role, security_token, created_at')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        security_token: userData?.security_token || null,
      },
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
