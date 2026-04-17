'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Shield, Search, Users, FileText, ArrowLeft, Eye, Trash2, Key, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface AdminUser {
  id: string
  username: string
  role: string
  security_token: string
  created_at: string
  testCount: number
}

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedUser, setSelectedUser] = useState<{ user: any; records: any[] } | null>(null)
  const [loadingRecords, setLoadingRecords] = useState(false)

  const handleLogin = async () => {
    if (!token.trim()) {
      toast.error('Please enter admin token')
      return
    }

    // Verify the token is for an admin user
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        if (data.user?.role === 'admin') {
          setIsLoggedIn(true)
          localStorage.setItem('admin-token', token)
          toast.success('Admin access granted')
          fetchUsers(token, 1, '')
        } else {
          toast.error('This account does not have admin privileges')
        }
      } else {
        toast.error('Invalid token')
      }
    } catch {
      toast.error('Authentication failed')
    }
  }

  useEffect(() => {
    // Check for saved admin token
    const savedToken = localStorage.getItem('admin-token')
    if (savedToken) {
      setToken(savedToken)
      // Verify it's still valid
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` },
      }).then(res => {
        if (res.ok) {
          return res.json()
        }
        throw new Error('Invalid')
      }).then(data => {
        if (data.user?.role === 'admin') {
          setIsLoggedIn(true)
          fetchUsers(savedToken, 1, '')
        }
      }).catch(() => {
        localStorage.removeItem('admin-token')
      })
    }
  }, [])

  const fetchUsers = async (authToken: string, pageNum: number, searchTerm: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?search=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=20`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      })
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
        setTotal(data.total || 0)
        setPage(pageNum)
      } else {
        toast.error(data.error || 'Failed to fetch users')
      }
    } catch {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchUsers(token, 1, search)
  }

  const fetchUserRecords = async (userId: string) => {
    setLoadingRecords(true)
    try {
      const res = await fetch(`/api/admin/test-records?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setSelectedUser(data)
      } else {
        toast.error(data.error || 'Failed to fetch records')
      }
    } catch {
      toast.error('Failed to fetch records')
    } finally {
      setLoadingRecords(false)
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}" and all their test records?`)) return
    try {
      const res = await fetch('/api/admin', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        toast.success(`User "${username}" deleted`)
        fetchUsers(token, page, search)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete user')
      }
    } catch {
      toast.error('Failed to delete user')
    }
  }

  const copyToken = (tok: string) => {
    navigator.clipboard.writeText(tok)
    toast.success('Token copied!')
  }

  const totalPages = Math.ceil(total / 20)

  // Recalculate marks for a record
  const getRecordMarks = (record: any) => {
    const marked = (record.marked_answers || '').split('')
    const correct = (record.correct_answers || '').split('')
    const subjects = record.selected_subjects || { physics: true, chemistry: true, botany: true, zoology: true }
    let correctCount = 0, wrongCount = 0

    for (let i = 0; i < 180; i++) {
      const qNum = i + 1
      const subject = qNum <= 45 ? 'physics' : qNum <= 90 ? 'chemistry' : qNum <= 135 ? 'botany' : 'zoology'
      if (!subjects[subject]) continue
      const m = marked[i]
      const c = correct[i]
      if (m === '0' || !m) continue
      if (m === c) correctCount++
      else wrongCount++
    }

    return (correctCount * 4) - (wrongCount * 1)
  }

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-2">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Admin Access</CardTitle>
            <CardDescription>This area is restricted to administrators only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin JWT Token</label>
              <Input
                type="password"
                placeholder="Enter admin JWT token..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="font-mono"
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              <Shield className="w-4 h-4 mr-2" />
              Access Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin dashboard
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => { setIsLoggedIn(false); localStorage.removeItem('admin-token'); setToken(''); }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <Badge variant="destructive" className="text-xs">ADMIN</Badge>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {selectedUser ? (
          // User detail view
          <div className="space-y-6">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User: {selectedUser.user?.username}
                </CardTitle>
                <CardDescription>
                  Created: {new Date(selectedUser.user?.created_at).toLocaleDateString()} •
                  Tests: {selectedUser.records?.length || 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRecords ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>Test Name</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Marks</TableHead>
                          <TableHead>Subjects</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedUser.records || []).map((record: any) => {
                          const marks = getRecordMarks(record)
                          const subjects = record.selected_subjects || {}
                          const subjectNames = Object.entries(subjects)
                            .filter(([, v]) => v)
                            .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1, 4))
                          return (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">{record.test_name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(record.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className={`font-bold ${marks >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {marks}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {subjectNames.map(s => (
                                    <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {record.notes || '-'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Users list view
          <div className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by username..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={loading}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">{total}</div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <FileText className="w-6 h-6 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">
                    {users.reduce((sum, u) => sum + u.testCount, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Tests</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="w-6 h-6 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">
                    {users.filter(u => u.role === 'admin').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Admins</div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Registered Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    No users found
                  </div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Tests</TableHead>
                          <TableHead>Security Token</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.username}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{u.testCount}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {u.security_token}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToken(u.security_token)}
                                >
                                  <Key className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => fetchUserRecords(u.id)}
                                  title="View tests"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {u.role !== 'admin' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                    title="Delete user"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={page <= 1}
                      onClick={() => fetchUsers(token, page - 1, search)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={page >= totalPages}
                      onClick={() => fetchUsers(token, page + 1, search)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Admin Panel — Authorized Access Only
        </div>
      </footer>
    </div>
  )
}
