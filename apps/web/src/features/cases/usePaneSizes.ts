import { useEffect, useState, type RefObject } from 'react'
import type { PaneSize } from '@/components/ui/ResizeHandle'

export interface PaneConfig { key: string; tree: number; detail: number }
const TREE = [180, 480] as const
const DETAIL = [380, 900] as const
const LIST_MIN = 360

type Saved = { tree: number; detail: number }

function load({ key, tree, detail }: PaneConfig): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null')
    return { tree: Number.isFinite(v?.tree) ? v.tree : tree, detail: Number.isFinite(v?.detail) ? v.detail : detail }
  } catch {
    return { tree, detail }
  }
}

function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Lebar kolom Section dan Detail (kolom daftar mengisi sisanya), disimpan per browser. */
export function usePaneSizes(container: RefObject<HTMLElement | null>, config: PaneConfig): { tree: PaneSize; detail: PaneSize } {
  const [saved, setSaved] = useState(() => load(config))
  const width = useElementWidth(container) || 1440

  // Ukuran tersimpan tidak diubah saat jendela mengecil; hanya ditampilkan lebih kecil agar daftar tetap muat.
  const detailMax = Math.max(DETAIL[0], Math.min(DETAIL[1], width - TREE[0] - LIST_MIN))
  const detail = clamp(saved.detail, DETAIL[0], detailMax)
  const treeMax = Math.max(TREE[0], Math.min(TREE[1], width - detail - LIST_MIN))
  const tree = clamp(saved.tree, TREE[0], treeMax)

  function update(patch: Partial<Saved>) {
    const next = { ...saved, ...patch }
    setSaved(next)
    try { localStorage.setItem(config.key, JSON.stringify(next)) } catch { /* private mode */ }
  }

  return {
    tree: { value: tree, min: TREE[0], max: treeMax, set: (v) => update({ tree: v }), reset: () => update({ tree: config.tree }) },
    detail: { value: detail, min: DETAIL[0], max: detailMax, set: (v) => update({ detail: v }), reset: () => update({ detail: config.detail }) },
  }
}
