import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { Person } from '@/features/cases/domain'

/** User terdaftar di workspace yang sama (Firebase Auth, lewat Worker). */
export const useUsers = (enabled: boolean) =>
  useQuery({ queryKey: ['users'], queryFn: () => apiGet<Person[]>('/v1/users'), enabled })
