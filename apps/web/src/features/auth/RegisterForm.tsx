import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { register } from './api'
import { useAuth } from './session'
import { WORKSPACES } from '@/lib/workspaces'
import { Field, SelectField, linkClass, submitClass } from './Field'
import { useAuthForm } from './useAuthForm'

const EMAIL = /^\S+@\S+\.\S+$/
const empty = { name: '', workspaceId: '', email: '', password: '' }

export function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [v, setV] = useState(empty)
  const { errors, formError, pending, submit } = useAuthForm(
    (f: typeof empty) => ({
      ...(f.name.trim() ? {} : { name: t('auth.errors.required') }),
      ...(f.workspaceId ? {} : { workspaceId: t('auth.errors.required') }),
      ...(EMAIL.test(f.email) ? {} : { email: t('auth.errors.email') }),
      ...(f.password.length >= 8 ? {} : { password: t('auth.errors.weakPassword') }),
    }),
    async (f) => {
      const session = await register({ name: f.name.trim(), workspaceId: f.workspaceId, email: f.email.trim(), password: f.password })
      useAuth.setState({ session, ready: true })
      await navigate({ to: '/' })
    },
  )
  const bind = (key: keyof typeof empty) => ({
    id: key,
    value: v[key],
    onChange: (e: { target: { value: string } }) => setV({ ...v, [key]: e.target.value }),
    error: errors[key],
  })

  return (
    <form noValidate onSubmit={(e) => submit(e, v)} className="flex w-full max-w-[380px] animate-rise flex-col gap-5" style={{ animationDelay: '0.15s' }}>
      <div>
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('register.title')}</h2>
        <p className="mt-1.5 text-ink-muted">{t('register.subtitle')}</p>
      </div>

      <Field {...bind('name')} label={t('register.name')} autoComplete="name" placeholder={t('register.namePlaceholder')} />
      <SelectField {...bind('workspaceId')} label={t('register.workspace')} placeholder={t('register.workspacePlaceholder')} options={WORKSPACES} />
      <Field {...bind('email')} label={t('signIn.email')} type="email" autoComplete="email" placeholder={t('signIn.emailPlaceholder')} />
      <Field {...bind('password')} label={t('signIn.password')} type="password" autoComplete="new-password" placeholder={t('signIn.passwordPlaceholder')} />

      {formError && <p role="alert" className="m-0 rounded-md border border-[#F0C2C2] bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger-text">{formError}</p>}

      <button type="submit" disabled={pending} className={submitClass}>{t('register.submit')}</button>

      <div className="border-t border-border-subtle pt-4 text-[13px] text-ink-muted">
        {t('register.haveAccount')}{' '}
        <Link to="/" className={linkClass}>{t('register.signIn')}</Link>
      </div>
    </form>
  )
}
