import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNegocio } from './useNegocio'

const mockNegocio = {
  id: 1,
  nombre: 'Padel Zona Norte',
  rubro: 'padel',
  slug: 'zona-norte',
  color_primario: '#FF6B6B',
  color_dark: '#cc5555',
  logo_emoji: '🎾',
  descripcion: 'Reserva tus canches',
  horarios: '08:00 – 23:00',
  bienvenida: '¡Hola! Bienvenido a Padel Zona Norte',
  webhook_url: 'https://n8n.simplificia.com.ar/webhook/padel',
  activo: true,
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('useNegocio', () => {
  it('starts in loading status', () => {
    fetch.mockReturnValueOnce(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    expect(result.current.status).toBe('loading')
    expect(result.current.negocio).toBeNull()
  })

  it('returns ready + negocio when Baserow returns an active business', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [mockNegocio] }),
    })

    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.negocio).toEqual(mockNegocio)
  })

  it('returns not_found when Baserow returns empty results', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const { result } = renderHook(() => useNegocio('padel', 'no-existe'))
    await waitFor(() => expect(result.current.status).toBe('not_found'))
    expect(result.current.negocio).toBeNull()
  })

  it('returns suspended when activo is false', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ ...mockNegocio, activo: false }] }),
    })

    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    await waitFor(() => expect(result.current.status).toBe('suspended'))
    expect(result.current.negocio).toBeNull()
  })

  it('returns error when fetch rejects', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('returns error when Baserow returns HTTP error', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(() => useNegocio('padel', 'zona-norte'))
    await waitFor(() => expect(result.current.status).toBe('error'))
  })
})
