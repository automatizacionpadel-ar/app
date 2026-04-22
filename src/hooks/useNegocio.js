import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_BASEROW_API_URL
const TOKEN = import.meta.env.VITE_BASEROW_TOKEN
const TABLE_ID = import.meta.env.VITE_BASEROW_TABLE_ID

export function useNegocio(rubro, slug) {
  const [negocio, setNegocio] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!rubro || !slug) {
      setStatus('not_found')
      return
    }

    setStatus('loading')
    setNegocio(null)

    const url =
      `${API_URL}/api/database/rows/table/${TABLE_ID}/` +
      `?user_field_names=true` +
      `&filter__rubro__equal=${encodeURIComponent(rubro)}` +
      `&filter__slug__equal=${encodeURIComponent(slug)}`

    fetch(url, { headers: { Authorization: `Token ${TOKEN}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!data.results || data.results.length === 0) {
          setStatus('not_found')
          return
        }
        const row = data.results[0]
        if (!row.activo) {
          setStatus('suspended')
          return
        }
        setNegocio(row)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [rubro, slug])

  return { negocio, status }
}
