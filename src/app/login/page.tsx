// src/app/login/page.tsx
'use client'

import { useState } from 'react'

import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

export default function LoginPage() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', authData.user.id)
      .single()

    window.location.href = usuario?.rol === 'superadmin' ? '/admin' : '/dashboard'
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(122,182,25,0.08) 0%, #20201F 60%)' }}>

      <div className="w-full max-w-sm animate-fade-up">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image src="/logo.png" alt="SimplificIA" width={400} height={104} priority />
        </div>

        {/* Card */}
        <div className="rounded-xl p-8"
          style={{ background: '#2A2A29', border: '1px solid #3D3D3B' }}>

          <h1 className="text-xl font-semibold mb-1" style={{ color: '#F0F0EE' }}>
            Bienvenido
          </h1>
          <p className="text-sm mb-6" style={{ color: '#9A9A96' }}>
            Ingresá a tu panel de gestión
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg p-3 mb-4 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#9A9A96' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="w-full rounded-lg px-4 py-3 text-sm transition-all"
                style={{
                  background: '#20201F',
                  border: '1.5px solid #3D3D3B',
                  color: '#F0F0EE',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#7AB619'}
                onBlur={e => e.target.style.borderColor = '#3D3D3B'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#9A9A96' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg px-4 py-3 pr-11 text-sm transition-all"
                  style={{
                    background: '#20201F',
                    border: '1.5px solid #3D3D3B',
                    color: '#F0F0EE',
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#7AB619'}
                  onBlur={e => e.target.style.borderColor = '#3D3D3B'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: '#5C5C59' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: '#7AB619', color: '#20201F' }}
              onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = '#8FD01E')}
              onMouseLeave={e => ((e.target as HTMLElement).style.background = '#7AB619')}>
              {loading ? (
                <span className="animate-pulse-soft">Ingresando...</span>
              ) : (
                <>
                  <LogIn size={16} />
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#5C5C59' }}>
          SimplificIA © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  )
}
