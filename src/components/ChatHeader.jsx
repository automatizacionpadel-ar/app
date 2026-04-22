import React, { useState } from 'react'

export default function ChatHeader({ negocio, onClearHistory }) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <header className="chat-header" role="banner">
        <div className="chat-header__left">
          <span className="chat-header__logo" aria-hidden="true">{negocio.logo_emoji}</span>
          <div className="chat-header__info">
            <div className="chat-header__name">{negocio.nombre}</div>
            <div className="chat-header__status">● En línea</div>
          </div>
        </div>
        <div className="chat-header__actions">
          <button
            className="btn-icon"
            onClick={() => setShowConfirm(true)}
            aria-label="Limpiar historial"
            title="Limpiar historial"
            type="button"
          >
            🗑️
          </button>
        </div>
      </header>

      {showConfirm && (
        <ConfirmDialog
          message="¿Borrar todo el historial de esta conversación?"
          onConfirm={() => { onClearHistory(); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
          color={negocio.color_primario}
        />
      )}
    </>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel, color }) {
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-box">
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn--cancel" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className="confirm-btn confirm-btn--confirm"
            style={{ background: color }}
            onClick={onConfirm}
            type="button"
          >
            Borrar
          </button>
        </div>
      </div>
      <style>{`
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .confirm-box {
          background: var(--color-surface);
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 320px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .confirm-message {
          font-size: 15px;
          color: var(--color-text);
          line-height: 1.5;
          margin-bottom: 20px;
          text-align: center;
        }
        .confirm-actions {
          display: flex;
          gap: 12px;
        }
        .confirm-btn {
          flex: 1;
          height: 44px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .confirm-btn:active { opacity: 0.75; }
        .confirm-btn--cancel {
          background: rgba(0,0,0,0.08);
          color: var(--color-text);
        }
        .confirm-btn--confirm { color: white; }
      `}</style>
    </div>
  )
}
