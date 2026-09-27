import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/stores/theme-store'
import { useToast } from '@/hooks/use-toast'
import { useResetAllData, exportFullBackupJSON, restoreFullBackupJSON, checkAndRunWeeklyAutoBackup } from '@/services/inventory-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { User, Palette, Shield, Save, RotateCcw, AlertTriangle, CheckCircle, Smartphone, Download, Info, Loader2, Upload, Calendar, RefreshCw } from 'lucide-react'
import { isRunningAsStandalone } from '@/components/common/pwa-install-prompt'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function SettingsPage() {
  const { user, profile, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const resetAllData = useResetAllData()

  const [loading, setLoading] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [isInstalled, setIsInstalled] = useState(false)
  const [backupLoading, setBackupLoading] = useState<'daily' | 'weekly' | 'instant' | 'restore' | null>(null)
  
  // Weekly Auto-Backup State
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    return localStorage.getItem('turf_auto_backup_enabled') !== 'false'
  })
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => {
    return localStorage.getItem('turf_last_weekly_backup_date') || localStorage.getItem('turf_last_backup_date')
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsInstalled(isRunningAsStandalone())
    const handleInstalled = () => setIsInstalled(true)
    window.addEventListener('appinstalled', handleInstalled)

    // Check weekly auto-backup status on page load
    const autoRan = checkAndRunWeeklyAutoBackup()
    if (autoRan) {
      const nowIso = new Date().toISOString()
      setLastBackupDate(nowIso)
      toast({
        title: 'Weekly Auto-Backup Triggered!',
        description: '7 days elapsed. Your weekly backup file has been generated & downloaded.',
      })
    }

    return () => window.removeEventListener('appinstalled', handleInstalled)
  }, [toast])

  const handleToggleAutoBackup = (enabled: boolean) => {
    setAutoBackupEnabled(enabled)
    localStorage.setItem('turf_auto_backup_enabled', enabled ? 'true' : 'false')
    toast({
      title: enabled ? 'Weekly Auto-Backup Enabled' : 'Weekly Auto-Backup Disabled',
      description: enabled
        ? 'The app will automatically generate and download a backup JSON file every 7 days.'
        : 'Automated weekly backups turned off.',
    })
  }

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      email: profile?.email || '',
    },
  })

  const handleProfileUpdate = async (data: ProfileFormData) => {
    setLoading(true)
    try {
      await updateProfile({ full_name: data.full_name })
      toast({ title: 'Profile updated', description: 'Your profile has been updated successfully' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReset = async () => {
    if (confirmInput.trim().toUpperCase() !== 'RESET') {
      toast({ variant: 'destructive', title: 'Confirmation mismatch', description: 'Please type RESET to confirm data clear.' })
      return
    }

    try {
      await resetAllData.mutateAsync()
      toast({ title: 'Data Reset Successful!', description: 'All trial bookings, sales, expenses, and staff records have been cleared. Inventory stock set to 0.' })
      setIsResetModalOpen(false)
      setConfirmInput('')
    } catch (e) {
      toast({ variant: 'destructive', title: 'Reset Failed', description: 'Failed to clear data. Please try again.' })
    }
  }

  const handleInstantJSONBackup = async () => {
    setBackupLoading('instant')
    try {
      await exportFullBackupJSON()
      const nowIso = new Date().toISOString()
      setLastBackupDate(nowIso)
      toast({
        title: 'Instant Backup Downloaded!',
        description: 'Full system backup exported as a JSON file to your downloads.',
      })
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Backup Export Failed',
        description: e instanceof Error ? e.message : 'Unable to generate JSON backup.',
      })
    } finally {
      setBackupLoading(null)
    }
  }

  const handleFileRestoreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setBackupLoading('restore')
    try {
      const text = await file.text()
      await restoreFullBackupJSON(text)
      toast({
        title: 'Backup Restored Successfully!',
        description: 'System data and local preferences have been updated from the backup file.',
      })
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Restore Failed',
        description: 'Invalid backup JSON file or corrupt format.',
      })
    } finally {
      setBackupLoading(null)
      if (e.target) e.target.value = ''
    }
  }

  const handleBackupRun = async (schedule: 'daily' | 'weekly') => {
    setBackupLoading(schedule)
    try {
      const response = await fetch(`http://localhost:3001/api/backup?schedule=${schedule}`).catch(() => null)
      
      if (response && response.ok) {
        const result = await response.json().catch(() => ({}))
        const nowIso = new Date().toISOString()
        setLastBackupDate(nowIso)
        localStorage.setItem('turf_last_backup_date', nowIso)
        toast({
          title: `${schedule === 'daily' ? 'Daily' : 'Weekly'} server backup completed!`,
          description: result?.message || 'Backup successfully saved to server storage.',
        })
      } else {
        // Server offline or not running — fallback smoothly to browser JSON download
        await exportFullBackupJSON()
        const nowIso = new Date().toISOString()
        setLastBackupDate(nowIso)
        toast({
          title: `${schedule === 'daily' ? 'Daily' : 'Weekly'} backup completed!`,
          description: 'Server port 3001 unreachable. Exported full JSON backup directly to downloads.',
        })
      }
    } catch (error) {
      // Direct browser fallback
      await exportFullBackupJSON()
      const nowIso = new Date().toISOString()
      setLastBackupDate(nowIso)
      toast({
        title: 'Backup generated successfully!',
        description: 'Exported complete system JSON backup file to your browser.',
      })
    } finally {
      setBackupLoading(null)
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Manage your account preferences, PWA mobile app, and system state</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        {/* Horizontal scrollable tab pills on mobile, clean grid on desktop */}
        <div className="w-full overflow-x-auto pb-1 pt-0.5 scrollbar-none">
          <TabsList className="inline-flex w-max min-w-full h-auto p-1 bg-muted/60 border border-border/40 rounded-xl gap-1 justify-start sm:grid sm:grid-cols-5 sm:w-full">
            <TabsTrigger
              value="profile"
              className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              <User className="h-4 w-4 shrink-0" />
              <span>Profile</span>
            </TabsTrigger>

            <TabsTrigger
              value="app"
              className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Mobile App</span>
            </TabsTrigger>

            <TabsTrigger
              value="appearance"
              className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              <Palette className="h-4 w-4 shrink-0" />
              <span>Appearance</span>
            </TabsTrigger>

            <TabsTrigger
              value="security"
              className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span>Security & Backup</span>
            </TabsTrigger>

            <TabsTrigger
              value="reset"
              className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              <RotateCcw className="h-4 w-4 text-red-400 shrink-0" />
              <span>Reset Data</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Profile Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs sm:text-sm">Full Name</Label>
                  <Input id="full_name" {...form.register('full_name')} className="text-sm" />
                  {form.formState.errors.full_name && (
                    <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                  <Input id="email" type="email" disabled {...form.register('email')} className="text-sm bg-muted/50" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <Button type="submit" loading={loading} className="w-full sm:w-auto">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="app">
          <Card className="border-emerald-900/40 bg-slate-900/80 text-white">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-emerald-400">
                <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
                <span>Install App / Add to Home Screen</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                Install the Elite Arena app on your Phone, Tablet, or Computer for offline access, fast loading, and native app experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-6">
              <div className="bg-slate-950/60 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm sm:text-base">App Installation Status</h4>
                      {isInstalled ? (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Installed
                        </span>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                          Ready to Install
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {isInstalled
                        ? 'Elite Arena is installed as a native web app on this device.'
                        : 'Trigger the app installation dialog or view step-by-step guide.'}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      window.dispatchEvent(new Event('trigger-pwa-install'))
                      toast({ title: 'Install Triggered', description: 'Follow the popup dialog at the bottom to complete app installation.' })
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full sm:w-auto shrink-0"
                  >
                    <Download className="w-4 h-4 mr-2" /> {isInstalled ? 'Re-open Install Banner' : 'Show Install Banner'}
                  </Button>
                </div>

                <Separator className="bg-slate-800" />

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-400" />
                    How to Add to Home Screen Manually:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                    <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 space-y-2">
                      <span className="font-bold text-emerald-400 block text-xs sm:text-sm">📱 Android (Chrome / Edge / Samsung):</span>
                      <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                        <li>Tap the <strong>3 dots menu</strong> (⋮) in top right of Chrome/Edge.</li>
                        <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                        <li>Confirm <strong>Install</strong> to add icon directly to your phone apps screen.</li>
                      </ol>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 space-y-2">
                      <span className="font-bold text-emerald-400 block text-xs sm:text-sm">🍎 iPhone / iPad (Safari):</span>
                      <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                        <li>Tap the <strong>Share button</strong> (square with up arrow at bottom of Safari).</li>
                        <li>Scroll down the options and tap <strong>"Add to Home Screen"</strong>.</li>
                        <li>Tap <strong>Add</strong> in top right corner.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Appearance</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Customize the look of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-6">
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-3 block">Theme</Label>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`cursor-pointer rounded-xl border-2 p-2 sm:p-4 transition-all ${
                      theme === 'light' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => setTheme('light')}
                  >
                    <div className="flex h-14 sm:h-20 w-full items-center justify-center rounded-lg bg-white border mb-2 sm:mb-3 p-1">
                      <div className="w-4/5 h-1.5 bg-gray-200 rounded" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-center truncate">Light</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`cursor-pointer rounded-xl border-2 p-2 sm:p-4 transition-all ${
                      theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => setTheme('dark')}
                  >
                    <div className="flex h-14 sm:h-20 w-full items-center justify-center rounded-lg bg-gray-900 border mb-2 sm:mb-3 p-1">
                      <div className="w-4/5 h-1.5 bg-gray-700 rounded" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-center truncate">Dark</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`cursor-pointer rounded-xl border-2 p-2 sm:p-4 transition-all ${
                      theme === 'system' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => setTheme('system')}
                  >
                    <div className="flex h-14 sm:h-20 w-full items-center justify-center rounded-lg bg-gradient-to-r from-white to-gray-900 border mb-2 sm:mb-3 p-1">
                      <div className="w-4/5 h-1.5 bg-gradient-to-r from-gray-200 to-gray-700 rounded" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-center truncate">System</p>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" /> Security, Backups & Auto-Backup
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage system backups, weekly auto-backup schedules, and recovery.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              
              {/* WEEKLY AUTO-BACKUP TOGGLE */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <p className="font-bold text-sm text-white">Automatic Weekly Backup</p>
                  </div>
                  <p className="text-xs text-slate-400">
                    Automatically exports and downloads a full JSON backup every 7 days on app load.
                  </p>
                  {lastBackupDate && (
                    <p className="text-[11px] text-emerald-400 font-medium pt-0.5">
                      Last Backup: {new Date(lastBackupDate).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-300 font-semibold">{autoBackupEnabled ? 'ACTIVE (7 Days)' : 'DISABLED'}</span>
                  <Switch
                    checked={autoBackupEnabled}
                    onCheckedChange={handleToggleAutoBackup}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              </div>

              {/* INSTANT DOWNLOAD & RESTORE BACKUP */}
              <div className="border border-border rounded-xl bg-muted/30 p-4 space-y-4">
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-white">Direct JSON Backup Export & Restore</p>
                  <p className="text-xs text-muted-foreground">Download a complete system JSON backup file directly from browser or restore from an existing file.</p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileRestoreUpload}
                  accept=".json"
                  className="hidden"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={handleInstantJSONBackup}
                    disabled={backupLoading !== null}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                  >
                    {backupLoading === 'instant' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Exporting JSON...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> Download JSON Backup
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={backupLoading !== null}
                    className="w-full border-slate-700 text-slate-200 hover:bg-slate-800 font-medium transition-all"
                  >
                    {backupLoading === 'restore' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Restoring...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-emerald-400" /> Restore Backup File
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {/* SERVER BACKUP RUNNERS */}
              <div className="border border-border rounded-xl bg-muted/30 p-4 space-y-4">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm">Server-Side Backup Jobs</p>
                  <p className="text-xs text-muted-foreground">Trigger manual daily or weekly server backup jobs (with automatic browser fallback).</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleBackupRun('daily')}
                    disabled={backupLoading !== null}
                    variant="secondary"
                    className="w-full transition-all text-xs font-semibold"
                  >
                    {backupLoading === 'daily' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Running Daily...
                      </span>
                    ) : (
                      'Run Daily Backup Job'
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleBackupRun('weekly')}
                    disabled={backupLoading !== null}
                    className="w-full transition-all text-xs font-semibold"
                  >
                    {backupLoading === 'weekly' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Running Weekly...
                      </span>
                    ) : (
                      'Run Weekly Backup Job'
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-muted/50">
                <div className="space-y-0.5">
                  <p className="font-medium text-xs sm:text-sm">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
                <Button variant="outline" size="sm" className="w-full xs:w-auto shrink-0">
                  Change
                </Button>
              </div>

              <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="space-y-0.5">
                  <p className="font-medium text-xs sm:text-sm text-destructive">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
                </div>
                <Button variant="destructive" size="sm" className="w-full xs:w-auto shrink-0">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reset">
          <Card className="border-red-900/40 bg-slate-900/80">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-red-400 flex items-center gap-2 text-lg sm:text-xl">
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 shrink-0" />
                <span>Data Reset & Clear Everything</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                Wipe all trial bookings, sales logs, expenses, staff wages, and reset product stock quantities to 0 for a completely clean start.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-6">
              <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-4 space-y-3">
                <p className="font-bold text-red-300 text-xs sm:text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> What will happen when you reset:
                </p>
                <ul className="text-xs text-slate-300 space-y-2 pl-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /> All trial ground bookings will be permanently removed.
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /> All daily drink & add-on sales logs will be wiped clean.
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /> All expenses, labor payment history, and liabilities will be cleared.
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Product catalog items remain present in inventory, but stock set to 0.
                  </li>
                </ul>
              </div>

              <div className="flex justify-stretch sm:justify-end">
                <Button
                  variant="destructive"
                  onClick={() => setIsResetModalOpen(true)}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 w-full sm:w-auto"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset All System Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Modal */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="bg-slate-900 border-red-800/60 text-white w-[92vw] max-w-md p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2 text-lg sm:text-xl">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 shrink-0" />
              <span>Confirm Full Data Reset</span>
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs sm:text-sm pt-2">
              Are you sure you want to clear all trial bookings, sales logs, and financial records? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div>
              <Label className="text-xs text-slate-300 mb-1.5 block font-semibold">
                Type <strong className="text-red-400 font-mono">RESET</strong> below to confirm:
              </Label>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type RESET here..."
                className="bg-slate-950 border-slate-700 text-white uppercase text-sm"
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsResetModalOpen(false)
                  setConfirmInput('')
                }}
                className="border-slate-700 text-slate-300 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirmInput.trim().toUpperCase() !== 'RESET' || resetAllData.isPending}
                onClick={handleConfirmReset}
                className="bg-red-600 hover:bg-red-500 font-bold w-full sm:w-auto"
              >
                {resetAllData.isPending ? 'Clearing Data...' : 'Confirm Reset & Wipe'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

