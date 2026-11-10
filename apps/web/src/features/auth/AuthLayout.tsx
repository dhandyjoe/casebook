import type { ReactNode } from 'react'
import { BrandPanel } from './BrandPanel'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-surface">
      <BrandPanel />
      <section className="box-border flex flex-1 basis-[460px] items-center justify-center px-6 py-12">{children}</section>
    </div>
  )
}
