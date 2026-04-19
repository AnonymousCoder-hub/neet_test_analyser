import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPassword, hashPassword, verifyToken, getTokenFromHeaders } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, securityToken, newPassword } = await request.json()

    if (!username || !securityToken || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    // Find user by username
    const { data: user, error } = await supabase
      .from('users')
      .select('id, security_token')
      .eq('username', username)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify security token
    if (user.security_token !== securityToken) {
      return NextResponse.json({ error: 'Invalid security token' }, { status: 401 })
    }

    // Hash new password
    const newHash = await hashPassword(newPassword)

    // Generate new security token (one-time use)
    const tokenBytes = new Uint8Array(8)
    crypto.getRandomValues(tokenBytes)
    const newSecurityToken = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase()

    // Update password and security token
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash, security_token: newSecurityToken })
      .eq('id', user.id)

    if (updateError) {
      console.error('Password reset error:', updateError)
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Password reset successfully',
      newSecurityToken,
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Change password for logged-in user
export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const authUser = await verifyToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    // Get current password hash
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    // Hash and update
    const newHash = await hashPassword(newPassword)
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', authUser.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
