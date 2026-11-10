import { auth } from './firebase'

/** GET ke Worker (architecture.md): token Firebase dikirim sebagai Bearer, Worker yang memverifikasinya. */
export async function apiGet<T>(path: string): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`)
  return res.json() as Promise<T>
}
