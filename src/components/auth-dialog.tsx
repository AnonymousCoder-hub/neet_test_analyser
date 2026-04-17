'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  User,
  Lock,
  Key,
  Eye,
  EyeOff,
  Shield,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { pullFromCloud } from '@/lib/auth-store'
import { toast } from 'sonner'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { login } = useAuth()

  // Login state
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Register state
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false)
  const [securityToken, setSecurityToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)

  // Reset password state
  const [resetUsername, setResetUsername] = useState('')
  const [resetSecurityToken, setResetSecurityToken] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [newSecurityToken, setNewSecurityToken] = useState<string | null>(null)
  const [newTokenCopied, setNewTokenCopied] = useState(false)

  // Active tab
  const [activeTab, setActiveTab] = useState('login')

  const resetAllForms = () => {
    setLoginUsername('')
    setLoginPassword('')
    setLoginLoading(false)
    setShowLoginPassword(false)

    setRegUsername('')
    setRegPassword('')
    setRegConfirmPassword('')
    setRegLoading(false)
    setShowRegPassword(false)
    setShowRegConfirmPassword(false)
    setSecurityToken(null)
    setTokenCopied(false)

    setResetUsername('')
    setResetSecurityToken('')
    setResetNewPassword('')
    setResetLoading(false)
    setShowResetPassword(false)
    setNewSecurityToken(null)
    setNewTokenCopied(false)

    setActiveTab('login')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetAllForms()
    }
    onOpenChange(newOpen)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!loginUsername.trim() || !loginPassword.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      })

      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      login(data.user, data.token)
      toast.success(`Welcome back, ${data.user.username}!`)

      // Auto-pull cloud data after login
      try {
        const result = await pullFromCloud(data.token)
        if (result.success && result.count > 0) {
          toast.success(`Synced ${result.count} test(s) from cloud`)
        }
      } catch {
        // Silent fail - cloud sync is optional
      }

      handleOpenChange(false)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!regUsername.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    if (regPassword !== regConfirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (regPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (regUsername.trim().length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }

    setRegLoading(true)
    setSecurityToken(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername.trim(), password: regPassword }),
      })

      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      login(data.user, data.token)

      // Auto-push existing local data to cloud on first registration
      try {
        const localRecords = JSON.parse(localStorage.getItem('testRecords') || '[]')
        if (localRecords.length > 0) {
          await fetch('/api/test-records', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`,
            },
            body: JSON.stringify({ records: localRecords }),
          })
          toast.success(`${localRecords.length} local test(s) synced to cloud`)
        }
      } catch {
        // Silent fail
      }

      if (data.user.securityToken) {
        setSecurityToken(data.user.securityToken)
      }

      toast.success(`Account created! Welcome, ${data.user.username}!`)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setRegLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!resetUsername.trim() || !resetSecurityToken.trim() || !resetNewPassword.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    if (resetNewPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    setResetLoading(true)
    setNewSecurityToken(null)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: resetUsername.trim(),
          securityToken: resetSecurityToken.trim(),
          newPassword: resetNewPassword,
        }),
      })

      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      setNewSecurityToken(data.newSecurityToken)
      setResetNewPassword('')
      setResetSecurityToken('')
      toast.success('Password reset successfully!')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'reg' | 'reset') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'reg') {
        setTokenCopied(true)
        setTimeout(() => setTokenCopied(false), 2000)
      } else {
        setNewTokenCopied(true)
        setTimeout(() => setNewTokenCopied(false), 2000)
      }
      toast.success('Copied to clipboard!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5 text-primary" />
            NEET Test Analyzer
          </DialogTitle>
          <DialogDescription>
            Sign in to your account or create a new one to sync your data across devices.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login" className="text-xs sm:text-sm">Login</TabsTrigger>
            <TabsTrigger value="register" className="text-xs sm:text-sm">Register</TabsTrigger>
            <TabsTrigger value="reset" className="text-xs sm:text-sm">Reset</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Username
                </Label>
                <Input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  disabled={loginLoading}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={loginLoading}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => setActiveTab('register')}
                >
                  Register here
                </button>
              </p>
            </form>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="mt-4">
            {securityToken ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span className="font-semibold">Account Created Successfully!</span>
                </div>

                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      Your Security Token
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-background rounded-md border border-green-500/20 p-3">
                    <code className="flex-1 text-sm font-mono font-bold tracking-wider text-green-700 dark:text-green-300 break-all">
                      {securityToken}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => copyToClipboard(securityToken, 'reg')}
                    >
                      {tokenCopied ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">
                      SAVE THIS TOKEN NOW! It is required to reset your password and will{' '}
                      <strong>only be shown once</strong>. You will not be able to see it again.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => handleOpenChange(false)}
                >
                  I&apos;ve Saved My Token — Continue
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Username
                  </Label>
                  <Input
                    id="reg-username"
                    type="text"
                    placeholder="Choose a username (3-30 characters)"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    disabled={regLoading}
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={regLoading}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-confirm-password" className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm-password"
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      disabled={regLoading}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={regLoading}>
                  {regLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setActiveTab('login')}
                  >
                    Sign in here
                  </button>
                </p>
              </form>
            )}
          </TabsContent>

          {/* Reset Password Tab */}
          <TabsContent value="reset" className="mt-4">
            {newSecurityToken ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span className="font-semibold">Password Reset Successfully!</span>
                </div>

                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      New Security Token
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-background rounded-md border border-green-500/20 p-3">
                    <code className="flex-1 text-sm font-mono font-bold tracking-wider text-green-700 dark:text-green-300 break-all">
                      {newSecurityToken}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => copyToClipboard(newSecurityToken, 'reset')}
                    >
                      {newTokenCopied ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">
                      SAVE THIS NEW TOKEN! Your old security token is no longer valid. This new token is{' '}
                      <strong>for one-time use only</strong> and will be replaced the next time you reset your password.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    setNewSecurityToken(null)
                    setActiveTab('login')
                  }}
                >
                  I&apos;ve Saved My Token — Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Use the security token provided during registration to reset your password. After resetting, you&apos;ll receive a new token.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-username" className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Username
                  </Label>
                  <Input
                    id="reset-username"
                    type="text"
                    placeholder="Enter your username"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    disabled={resetLoading}
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-token" className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Security Token
                  </Label>
                  <Input
                    id="reset-token"
                    type="text"
                    placeholder="Enter your security token"
                    value={resetSecurityToken}
                    onChange={(e) => setResetSecurityToken(e.target.value)}
                    disabled={resetLoading}
                    autoComplete="off"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-new-password" className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reset-new-password"
                      type={showResetPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      disabled={resetLoading}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Remember your password?{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setActiveTab('login')}
                  >
                    Sign in here
                  </button>
                </p>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
