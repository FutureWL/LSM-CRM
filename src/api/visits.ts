// 拜访 API

import { api } from './http'
import type { VisitDto, PageResult } from './dto'
import { dtoToVisit, visitCreateToDto, type VisitCreateInput } from './mappers'
import type { Visit } from '@/types'

export interface ListVisitsQuery {
  customerId?: string
  salesmanId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export async function listVisits(query: ListVisitsQuery = {}): Promise<{
  items: Visit[]
  page: number
  limit: number
}> {
  const res = await api.get<PageResult<VisitDto>>('/visits', { query })
  return { items: res.items.map(dtoToVisit), page: res.page, limit: res.limit }
}

export async function createVisit(input: VisitCreateInput): Promise<Visit> {
  const dto = await api.post<VisitDto>('/visits', visitCreateToDto(input))
  return dtoToVisit(dto)
}

export async function deleteVisit(id: string): Promise<void> {
  await api.delete(`/visits/${id}`)
}