import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPassword, createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, role')
      .eq('username', username)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // Create JWT token
    const token = await createToken({
      id: user.id,
      username: user.username,
      role: user.role,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
