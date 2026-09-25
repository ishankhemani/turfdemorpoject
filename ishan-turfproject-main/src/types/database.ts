export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Generic types for flexibility
export interface BaseEntity {
  id: string
  created_at: string
  updated_at?: string
}

export interface AddOnItem {
  id?: string
  name: string
  category: string
  qty: number
  price: number
}

export interface Booking extends BaseEntity {
  customer_name: string
  mobile_number: string
  area: string
  booking_date: string
  booking_time: string
  start_time?: string | null
  end_time?: string | null
  actual_end_time?: string | null
  sport: string
  amount: number
  paid_amount?: number | null
  pending_amount?: number | null
  payment_status: 'paid' | 'pending'
  payment_mode?: 'online' | 'offline' | 'split' | string | null
  online_amount?: number | null
  offline_amount?: number | null
  add_ons?: AddOnItem[] | null
  booking_status?: 'confirmed' | 'cancelled' | 'completed' | 'pending'
  customer_email?: string | null
  duration_minutes?: number | null
  transaction_id?: string | null
  source?: 'admin' | 'website' | string | null
  notes: string | null
  user_id: string
}

export interface InventoryItem extends BaseEntity {
  name: string
  category: string
  default_price: number
  quantity: number
  last_edited: string
  last_restocked_qty?: number | null
  user_id: string
}

export interface InventorySale extends BaseEntity {
  item_id?: string | null
  item_name: string
  date: string
  qty_sold: number
  amount: number
  booking_id?: string | null
  user_id: string
}

export interface Customer extends BaseEntity {
  name: string
  phone: string
  area: string
  total_bookings: number
  total_spent: number
  last_booking_date: string | null
  user_id: string
}

export interface Expense extends BaseEntity {
  date: string
  title: string
  description: string | null
  amount: number
  category: string
  user_id: string
}

export interface Labour extends BaseEntity {
  name: string
  phone: string
  role: string
  user_id: string
  /** Joined relation — present when fetched with labour_payments */
  payments?: LabourPayment[]
}


export interface LabourPayment extends BaseEntity {
  labour_id: string
  date: string
  amount: number
  remarks: string | null
  user_id: string
}

export interface Liability extends BaseEntity {
  person_name: string
  original_amount: number
  outstanding_amount: number
  description: string | null
  is_completed: boolean
  user_id: string
}

export interface LiabilityPayment extends BaseEntity {
  liability_id: string
  amount: number
  date: string
  user_id: string
}

export interface MarketingCampaign extends BaseEntity {
  title: string
  message: string
  campaign_type: 'seasonal' | 'festival' | 'tournament' | 'membership' | 'custom'
  sent_at: string | null
  recipient_count: number
  user_id: string
}

export interface Slot extends BaseEntity {
  time: string
  duration_minutes: number
  price: number
  is_active: boolean
  user_id: string
}

export interface User extends BaseEntity {
  email: string
  full_name: string | null
  avatar_url: string | null
  role?: 'admin' | 'staff' | string
}

export type PaymentStatus = 'paid' | 'pending'
export type CampaignType = 'seasonal' | 'festival' | 'tournament' | 'membership' | 'custom'
