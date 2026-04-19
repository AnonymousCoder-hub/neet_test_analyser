import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword, generateSecurityToken, createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: 'Username must be 3-30 characters' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 })
    }

    // Check if username already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Hash password with salt
    const passwordHash = await hashPassword(password)
    const securityToken = await generateSecurityToken()

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        security_token: securityToken,
        role: 'user',
      })
      .select('id, username, role, security_token, created_at')
      .single()

    if (error || !user) {
      console.error('Registration error:', error)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
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
        securityToken: user.security_token,
      },
      token,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
