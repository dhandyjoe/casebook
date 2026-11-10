import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authErrorKey, resetPassword, signIn } from './api'
import { Field, linkClass, submitClass } from './Field'
import { useAuthForm } from './useAuthForm'

const EMAIL = /^\S+@\S+\.\S+$/

export function SignInForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [notice, setNotice] = useState('')
  const { errors, formError, pending, submit } = useAuthForm(
    ({ email, password }: { email: string; password: string }) => ({
      ...(EMAIL.test(email) ? {} : { email: t('auth.errors.email') }),
      ...(password ? {} : { password: t('auth.errors.required') }),
    }),
    ({ email, password }) => signIn(email.trim(), password, remember),
  )
  const [resetError, setResetError] = useState('')

  async function forgot() {
    setNotice('')
    if (!EMAIL.test(email)) return setResetError(t('auth.errors.email'))
    setResetError('')
    try {
      await resetPassword(email.trim())
      setNotice(t('signIn.resetSent', { email: email.trim() }))
    } catch (err) {
      setResetError(t(authErrorKey(err)))
    }
  }

  return (
    <form noValidate onSubmit={(e) => submit(e, { email, password })} className="flex w-full max-w-[380px] animate-rise flex-col gap-5" style={{ animationDelay: '0.15s' }}>
      <div>
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('signIn.title')}</h2>
        <p className="mt-1.5 text-ink-muted">{t('signIn.subtitle')}</p>
      </div>

      <Field id="email" label={t('signIn.email')} type="email" autoComplete="email" placeholder={t('signIn.emailPlaceholder')}
        value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email ?? resetError} />

      <div className="flex flex-col gap-1.5">
        <Field id="password" label={t('signIn.password')} type="password" autoComplete="current-password" placeholder={t('signIn.passwordPlaceholder')}
          value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <button type="button" onClick={forgot} className={`${linkClass} cursor-pointer self-end border-0 bg-transparent p-0 text-[13px]`}>
          {t('signIn.forgot')}
        </button>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-ink-secondary">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="m-0 size-[18px] accent-accent" />
        {t('signIn.remember')}
      </label>

      {notice && <p role="status" className="m-0 rounded-md border border-[#B7E2C6] bg-[#EEF9F2] px-3.5 py-2.5 text-[13px] text-[#146C38]">{notice}</p>}
      {formError && <p role="alert" className="m-0 rounded-md border border-[#F0C2C2] bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger-text">{formError}</p>}

      <button type="submit" disabled={pending} className={submitClass}>{t('signIn.submit')}</button>

      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4 text-[13px] text-ink-muted">
        <span>
          {t('signIn.noWorkspace')}{' '}
          <Link to="/register" className={linkClass}>{t('signIn.signUp')}</Link>
        </span>
        <span>{t('signIn.invited')}</span>
      </div>
    </form>
  )
}
