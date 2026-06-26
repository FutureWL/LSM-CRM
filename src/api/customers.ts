// 客户 API

import { api } from './http'
import type { CustomerDto, CustomerWithVisitsDto, PageResult } from './dto'
import {
  dtoToCustomer,
  customerCreateToDto,
  customerPatchToDto,
  type CustomerCreateInput,
} from './mappers'
import type { Customer, Visit } from '@/types'

export interface ListCustomersQuery {
  stage?: string
  ownerId?: string
  q?: string
  page?: number
  limit?: number
}

export async function listCustomers(query: ListCustomersQuery = {}): Promise<{
  items: Customer[]
  page: number
  limit: number
  total: number
}> {
  const res = await api.get<PageResult<CustomerDto>>('/customers', { query })
  return {
    items: res.items.map(dtoToCustomer),
    page: res.page,
    limit: res.limit,
    total: res.total ?? res.items.length,
  }
}

export async function getCustomer(id: string): Promise<{ customer: Customer; recentVisits: Visit[] }> {
  const dto = await api.get<CustomerWithVisitsDto>(`/customers/${id}`)
  return {
    customer: dtoToCustomer(dto),
    recentVisits: dto.recentVisits.map((v) => ({
      id: v.id,
      customerId: v.customerId ?? id,
      salesId: v.salesmanId,
      visitedAt: v.visitedAt,
      duration: v.durationMin ?? 0,
      content: v.content,
      result: v.result,
      visitType: v.type,
      createdAt: v.visitedAt,
    })),
  }
}

export async function createCustomer(input: CustomerCreateInput): Promise<Customer> {
  const dto = await api.post<CustomerDto>('/customers', customerCreateToDto(input))
  return dtoToCustomer(dto)
}

export async function updateCustomer(id: string, patch: Partial<Customer>): Promise<Customer> {
  const dto = await api.patch<CustomerDto>(`/customers/${id}`, customerPatchToDto(patch))
  return dtoToCustomer(dto)
}

export interface TransferCustomerInput {
  toUserId: string
  reason?: string
}

export async function transferCustomer(id: string, input: TransferCustomerInput): Promise<Customer> {
  const dto = await api.post<CustomerDto>(`/customers/${id}/transfer`, input)
  return dtoToCustomer(dto)
}