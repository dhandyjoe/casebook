import { QueryClient } from '@tanstack/react-query'

// staleTime menghemat kuota baca Spark; SDK Firestore sudah menangani gangguan jaringan, jadi tanpa retry ganda.
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000, retry: false } } })
