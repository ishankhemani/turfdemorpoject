import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useCustomers } from '@/services/customers-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState, PageLoadingState } from '@/components/common/loading'
import { EmptyState } from '@/components/common/empty-state'
import { Megaphone, Send, Calendar, Users, History } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MarketingCampaign } from '@/types/database'

const campaignSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  type: z.enum(['seasonal', 'festival', 'tournament', 'membership', 'custom']),
})

type CampaignFormData = z.infer<typeof campaignSchema>

const campaignTypes = [
  { value: 'seasonal', label: 'Seasonal Offer', icon: '🏖️' },
  { value: 'festival', label: 'Festival Discount', icon: '🎉' },
  { value: 'tournament', label: 'Tournament', icon: '🏆' },
  { value: 'membership', label: 'Membership', icon: '💎' },
  { value: 'custom', label: 'Custom', icon: '✏️' },
]

export function MarketingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: customers } = useCustomers()
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', user?.id],
    queryFn: async (): Promise<MarketingCampaign[]> => {
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as MarketingCampaign[]
    },
    enabled: !!user,
  })

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { title: '', message: '', type: 'custom' },
  })

  const sendCampaign = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          title: data.title,
          message: data.message,
          campaign_type: data.type,
          user_id: user.id,
          sent_at: new Date().toISOString(),
          recipient_count: (customers || []).length,
        })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign sent!', description: `Message sent to ${(customers || []).length} customers` })
      setIsDialogOpen(false)
      form.reset()
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send campaign' })
    },
  })

  if (isLoading) {
    return <PageLoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground text-sm">Send offers and promotions to customers</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{(customers || []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Megaphone className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campaigns Sent</p>
                <p className="text-2xl font-bold">{(campaigns || []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <History className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Campaign</p>
                <p className="text-lg font-bold">{campaigns?.[0] ? formatDate(campaigns[0].created_at) : 'Never'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign History</CardTitle>
        </CardHeader>
        <CardContent>
          {(campaigns || []).length === 0 ? (
            <EmptyState icon={Megaphone} title="No campaigns yet" description="Send your first marketing campaign" action={{ label: 'Create Campaign', onClick: () => setIsDialogOpen(true) }} />
          ) : (
            <div className="space-y-3">
              {(campaigns || []).map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{campaign.title}</h3>
                        <Badge variant="secondary">{campaignTypes.find(t => t.value === campaign.campaign_type)?.label || campaign.campaign_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{campaign.message}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Sent to {campaign.recipient_count} customers</span>
                        <span>{formatDate(campaign.created_at)}</span>
                      </div>
                    </div>
                    <Badge variant={campaign.sent_at ? 'success' : 'secondary'}>
                      {campaign.sent_at ? 'Sent' : 'Draft'}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => sendCampaign.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v as CampaignFormData['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {campaignTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.icon} {type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Summer Special Offer" {...form.register('title')} />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea placeholder="Write your promotional message..." rows={4} {...form.register('message')} />
            </div>
            <div className="p-3 rounded-xl bg-muted/50 text-sm">
              <p className="text-muted-foreground">This message will be sent to {(customers || []).length} customers</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={sendCampaign.isPending}>
                <Send className="mr-2 h-4 w-4" />
                Send Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
