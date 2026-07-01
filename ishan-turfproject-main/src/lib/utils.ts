import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}


export function formatTime(date: Date | string): string {
  if (typeof date === 'string') {
    const timeMatch = date.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
    if (timeMatch) {
      const hours = Number(timeMatch[1])
      const minutes = Number(timeMatch[2])
      return formatClockTime(hours, minutes)
    }
  }

  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return String(date)

  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatClockTime(hours: number, minutes = 0): string {
  const normalizedHours = ((hours % 24) + 24) % 24
  const period = normalizedHours >= 12 ? 'PM' : 'AM'
  const displayHour = normalizedHours % 12 === 0 ? 12 : normalizedHours % 12
  const displayMinute = minutes.toString().padStart(2, '0')
  return `${displayHour}:${displayMinute} ${period}`
}

export function formatSlotRange(time: string, durationHours = 1): string {
  const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!timeMatch) return time
  const startHour = Number(timeMatch[1])
  const startMinute = Number(timeMatch[2])
  const endHour = startHour + durationHours
  return `${formatClockTime(startHour, startMinute)} - ${formatClockTime(endHour, startMinute)}`
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month]
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function isToday(date: Date | string): boolean {
  const d = new Date(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

export function isThisWeek(date: Date | string): boolean {
  const d = new Date(date)
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  return d >= startOfWeek && d <= endOfWeek
}

export function isThisMonth(date: Date | string): boolean {
  const d = new Date(date)
  const today = new Date()
  return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

export function getPercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
