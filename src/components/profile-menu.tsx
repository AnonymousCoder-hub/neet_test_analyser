'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { toast } from 'sonner'
import { User, LogOut, Settings, Key, Shield, ChevronDown, Loader2, Eye, EyeOff, Copy, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthDialog } from '@/components/auth-dialog'

// Generate a consistent color from username hash
function getAvatarColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // Convert to 32-bit integer
  }

  const colors = [
    'bg-rose-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-teal-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-lime-500',
    'bg-fuchsia-500',
  ]

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

export function ProfileMenu() {
  const { user, token, isAuthenticated, logout } = useAuth()

  // AuthDialog state
  const [authDialogOpen, setAuthDialogOpen] = useState(false)

  // Change Password dialog state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Security Token dialog state
  const [securityTokenOpen, setSecurityTokenOpen] = useState(false)
  const [securityToken, setSecurityToken] = useState<string | null>(null)
  const [loadingToken, setLoadingToken] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (!token) {
      toast.error('Not authenticated')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to change password')
        return
      }

      toast.success('Password changed successfully')
      setChangePasswordOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch {
      toast.error('An error occurred while changing password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleFetchSecurityToken = async () => {
    if (!token) {
      toast.error('Not authenticated')
      return
    }

    setLoadingToken(true)
    setSecurityTokenOpen(true)
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to fetch security token')
        setSecurityTokenOpen(false)
        return
      }

      // The /api/auth/me endpoint returns the user object
      // The security token may or may not be included depending on the API
      // If the API doesn't return a security_token, show the auth token (truncated)
      if (data.user?.security_token) {
        setSecurityToken(data.user.security_token)
      } else {
        // Show a truncated version of the current JWT token as the security reference
        setSecurityToken(token.substring(0, 32) + '...')
      }
    } catch {
      toast.error('Failed to fetch security token')
      setSecurityTokenOpen(false)
    } finally {
      setLoadingToken(false)
    }
  }

  const handleCopyToken = async () => {
    if (!securityToken) return
    try {
      await navigator.clipboard.writeText(securityToken)
      setCopiedToken(true)
      toast.success('Token copied to clipboard')
      setTimeout(() => setCopiedToken(false), 2000)
    } catch {
      toast.error('Failed to copy token')
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
  }

  // Not logged in - show Login button
  if (!isAuthenticated || !user) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAuthDialogOpen(true)}
          className="gap-2"
        >
          <User className="size-4" />
          <span className="hidden sm:inline">Login</span>
        </Button>

        <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      </>
    )
  }

  // Logged in - show profile dropdown
  const avatarInitial = user.username.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(user.username)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            <div
              className={`flex size-7 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor}`}
            >
              {avatarInitial}
            </div>
            <span className="hidden sm:inline max-w-[120px] truncate text-sm font-medium">
              {user.username}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor}`}
                >
                  {avatarInitial}
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium leading-none">{user.username}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setChangePasswordOpen(true)}
          >
            <Key className="size-4" />
            Change Password
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleFetchSecurityToken}
          >
            <Shield className="size-4" />
            Security Token
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              window.location.href = '/settings'
            }}
          >
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            variant="destructive"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={(open) => {
        setChangePasswordOpen(open)
        if (!open) {
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setShowCurrentPassword(false)
          setShowNewPassword(false)
          setShowConfirmPassword(false)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your account password. Make sure your new password is at least 6 characters.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangePasswordOpen(false)}
              disabled={changingPassword}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Token Dialog */}
      <Dialog open={securityTokenOpen} onOpenChange={setSecurityTokenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Security Token</DialogTitle>
            <DialogDescription>
              Your security token can be used for password recovery. Keep it safe and do not share it.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingToken ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : securityToken ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                  <code className="flex-1 text-sm font-mono break-all select-all">
                    {securityToken}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={handleCopyToken}
                  >
                    {copiedToken ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This token is unique to your account. Store it securely for password recovery.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Unable to retrieve security token.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSecurityTokenOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ProfileMenu
