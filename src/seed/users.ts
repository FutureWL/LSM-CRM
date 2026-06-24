import { faker } from '@faker-js/faker/locale/zh_CN'
import type { User } from '@/types'

faker.seed(42) // 固定种子,确保演示数据每次一致

const salesNames = ['张伟', '李娜', '王强', '刘洋', '陈静']
const adminNames = ['周总', '林总监']

const avatarColors = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#f97316']

function avatarFor(name: string, idx: number): string {
  // 用首字母 + 颜色生成简洁头像占位(SVG data URL)
  const ch = name.charAt(0)
  const color = avatarColors[idx % avatarColors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="50%" y="55%" font-size="28" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-weight="600" fill="#fff" text-anchor="middle" dominant-baseline="middle">${ch}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function buildSeedUsers(): User[] {
  const sales: User[] = salesNames.map((name, i) => ({
    id: `u_sales_${i + 1}`,
    name,
    role: 'sales',
    avatar: avatarFor(name, i),
    team: '华东大区',
    title: '销售经理',
  }))
  const admins: User[] = adminNames.map((name, i) => ({
    id: `u_admin_${i + 1}`,
    name,
    role: 'admin',
    avatar: avatarFor(name, i + 5),
    title: i === 0 ? '总经理' : '销售总监',
  }))
  return [...sales, ...admins]
}
