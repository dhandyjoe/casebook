import { onAuthStateChanged } from 'firebase/auth'
import { create } from 'zustand'
import { auth } from '@/lib/firebase'
import { queryClient } from '@/lib/queryClient'
import { loadWorkspaceId, toSession, type Session } from './api'

// ready = Firebase sudah memulihkan sesi; sebelum itu router tidak boleh menampilkan Sign in.
interface AuthState {
  session: Session | null
  ready: boolean
}

export const useAuth = create<AuthState>()(() => ({ session: null, ready: false }))

export const initAuth = () =>
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      queryClient.clear()
      useAuth.setState({ session: null, ready: true })
      return
    }
    const workspaceId = await loadWorkspaceId(user.uid)
    // User bisa sudah berganti atau keluar selama workspace dibaca.
    if (auth.currentUser?.uid === user.uid) useAuth.setState({ session: toSession(user, workspaceId), ready: true })
  })
