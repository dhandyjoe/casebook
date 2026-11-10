import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { authErrorKey } from './api'

/** Submit form auth: validasi dulu, lalu jalankan aksi; error Firebase jadi pesan UI. */
export function useAuthForm<V>(validate: (values: V) => Record<string, string>, run: (values: V) => Promise<unknown>) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent, values: V) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return
    setPending(true)
    try {
      await run(values)
    } catch (err) {
      setFormError(t(authErrorKey(err)))
    }
    setPending(false)
  }

  return { errors, formError, pending, submit }
}
