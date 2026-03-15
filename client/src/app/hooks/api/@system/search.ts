/// <reference types="vite/client" />
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export interface SearchHit {
  id: string | number
  [key: string]: unknown
}

export interface SearchResult<T = SearchHit> {
  hits: T[]
  total: number
  page: number
  totalPages: number
  processingTimeMs?: number
  provider: string
}

interface SearchResponse<T> {
  status: number
  message?: string
  data?: SearchResult<T>
}

export async function search<T = SearchHit>(params: {
  index: string
  q: string
  filters?: string
  sort?: string
  limit?: number
  offset?: number
  fields?: string
}): Promise<SearchResponse<T>> {
  const qs = new URLSearchParams()
  qs.set('q', params.q)
  if (params.filters) qs.set('filters', params.filters)
  if (params.sort) qs.set('sort', params.sort)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  if (params.fields) qs.set('fields', params.fields)

  try {
    const res = await fetch(`${BASE_URL}/search/${params.index}?${qs.toString()}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      return { status: res.status, message: err.message ?? 'Search failed' }
    }
    const data = (await res.json()) as SearchResult<T>
    return { status: 200, data }
  } catch (err) {
    return { status: 500, message: err instanceof Error ? err.message : 'Search failed' }
  }
}
