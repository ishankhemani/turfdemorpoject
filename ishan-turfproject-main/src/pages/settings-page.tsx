import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/stores/theme-store'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { User, Bell, Palette, Shield, Save } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function SettingsPage() {
  const { user, profile, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    bookingReminder: true,
    marketingOptIn: false,
  })

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" {...form.register('full_name')} />
                  {form.formState.errors.full_name && (
                    <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" disabled {...form.register('email')} />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <Button type="submit" loading={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch checked={notifications.email} onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                </div>
                <Switch checked={notifications.push} onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Booking Reminders</p>
                  <p className="text-sm text-muted-foreground">Get reminded 5 minutes before each booking</p>
                </div>
                <Switch checked={notifications.bookingReminder} onCheckedChange={(checked) => setNotifications({ ...notifications, bookingReminder: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Updates</p>
                  <p className="text-sm text-muted-foreground">Receive promotional offers and news</p>
                </div>
                <Switch checked={notifications.marketingOptIn} onCheckedChange={(checked) => setNotifications({ ...notifications, marketingOptIn: checked })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Theme</Label>
                <div className="grid grid-cols-3 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border'}`}
                    onClick={() => setTheme('light')}
                  >
                    <div className="flex h-20 w-full items-center justify-center rounded-lg bg-white border mb-3">
                      <div className="w-4/5 h-1.5 bg-gray-200 rounded" />
                    </div>
                    <p className="text-sm font-medium text-center">Light</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border'}`}
                    onClick={() => setTheme('dark')}
                  >
                    <div className="flex h-20 w-full items-center justify-center rounded-lg bg-gray-900 border mb-3">
                      <div className="w-4/5 h-1.5 bg-gray-700 rounded" />
                    </div>
                    <p className="text-sm font-medium text-center">Dark</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border'}`}
                    onClick={() => setTheme('system')}
                  >
                    <div className="flex h-20 w-full items-center justify-center rounded-lg bg-gradient-to-r from-white to-gray-900 border mb-3">
                      <div className="w-4/5 h-1.5 bg-gradient-to-r from-gray-200 to-gray-700 rounded" />
                    </div>
                    <p className="text-sm font-medium text-center">System</p>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">Update your account password</p>
                </div>
                <Button variant="outline">Change</Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Button variant="outline">Enable</Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and data</p>
                </div>
                <Button variant="destructive">Delete</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
