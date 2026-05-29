// src/components/layout/TopBar.tsx
'use client'

import { Menu } from 'lucide-react'
import Image from 'next/image'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header
      className="md:hidden flex items-center gap-3 h-14 px-4 flex-shrink-0"
      style={{ background: '#2A2A29', borderBottom: '1px solid #3D3D3B' }}>
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-lg"
        style={{ color: '#9A9A96' }}
        aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      <Image src="/logo.png" alt="SimplificIA" width={110} height={29} priority />
    </header>
  )
}
