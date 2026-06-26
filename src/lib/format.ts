import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export function formatDate(d?: string | Date, pattern = 'YYYY-MM-DD HH:mm'): string {
  if (!d) return '-'
  return dayjs(d).format(pattern)
}

export function formatDay(d?: string | Date): string {
  if (!d) return '-'
  return dayjs(d).format('YYYY-MM-DD')
}

export function formatMoney(n: number, withSymbol = true): string {
  if (n >= 10000) {
    return `${withSymbol ? '¥' : ''}${(n / 10000).toFixed(1)}万`
  }
  return `${withSymbol ? '¥' : ''}${n.toLocaleString()}`
}

export function fromNow(d?: string | Date): string {
  if (!d) return '-'
  return dayjs(d).fromNow()
}

export function isThisMonth(d?: string | Date): boolean {
  if (!d) return false
  return dayjs(d).isSame(dayjs(), 'month')
}

export function isToday(d?: string | Date): boolean {
  if (!d) return false
  return dayjs(d).isSame(dayjs(), 'day')
}

export function daysAgo(n: number): string {
  return dayjs().subtract(n, 'day').toISOString()
}
