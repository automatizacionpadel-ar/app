import React, { useState, useRef, useCallback, useEffect } from 'react'

// Convierte un Blob a base64 data URL
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState(null) // { dataUrl, mimeType, fileName }
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioError, setAudioError] = useState(null)

  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && recording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  function autoResize(el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function handleTextChange(e) {
    setText(e.target.value)
    autoResize(e.target)
  }

  // ── Envío de texto ──────────────────────────────────────────
  const handleSendText = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend({ type: 'text', text: trimmed })
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }, [text, disabled, onSend])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  // ── Imagen ──────────────────────────────────────────────────
  function handleImageButtonClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const dataUrl = await blobToBase64(file)
      setImagePreview({ dataUrl, mimeType: file.type || 'image/jpeg', fileName: file.name })
    } catch {
      console.error('[Chat] Error al leer imagen')
    }
  }

  function handleCancelImage() {
    setImagePreview(null)
  }

  function handleSendImage() {
    if (!imagePreview || disabled) return
    onSend({
      type: 'image',
      text: text.trim(),
      mediaData: imagePreview.dataUrl,
      mimeType: imagePreview.mimeType,
      fileName: imagePreview.fileName,
    })
    setImagePreview(null)
    setText('')
  }

  // ── Audio ───────────────────────────────────────────────────
  async function startRecording() {
    setAudioError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const dataUrl = await blobToBase64(blob)
        onSend({ type: 'audio', text: '', mediaData: dataUrl, mimeType })
        setRecording(false)
        setRecordingSeconds(0)
        if (timerRef.current) clearInterval(timerRef.current)
      }

      recorder.start(100)
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecordingSeconds(0)

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1)
      }, 1000)
    } catch (err) {
      console.error('[Audio] Error de micrófono:', err)
      setAudioError('No se pudo acceder al micrófono. Verificá los permisos.')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && recording) {
      // Vaciar chunks para que onstop no envíe nada
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop())
        setRecording(false)
        setRecordingSeconds(0)
        if (timerRef.current) clearInterval(timerRef.current)
        audioChunksRef.current = []
      }
      mediaRecorderRef.current.stop()
    }
  }

  function handleMicClick() {
    if (disabled) return
    if (recording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // ── Estados derivados ───────────────────────────────────────
  const hasText = text.trim().length > 0
  const canSendText = hasText && !disabled && !recording && !imagePreview
  const inImageMode = !!imagePreview && !recording
  const inRecordingMode = recording

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="chat-input-wrapper" role="form" aria-label="Escribir mensaje">

      {/* Input oculto para imágenes */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Modo grabación de audio */}
      {inRecordingMode && (
        <>
          <button className="btn-icon-sm btn-cancel" onClick={cancelRecording} aria-label="Cancelar grabación" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="recording-indicator">
            <span className="recording-dot" aria-hidden="true" />
            <span className="recording-time">{formatDuration(recordingSeconds)}</span>
            <span className="recording-label">Grabando...</span>
          </div>
          <button className="btn-send btn-send--recording" onClick={stopRecording} aria-label="Detener y enviar audio" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </button>
        </>
      )}

      {/* Modo preview de imagen */}
      {inImageMode && (
        <>
          <button className="btn-icon-sm btn-cancel" onClick={handleCancelImage} aria-label="Cancelar imagen" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="image-preview-row">
            <img src={imagePreview.dataUrl} alt="Vista previa" className="image-preview-thumb" />
            <span className="image-preview-name">{imagePreview.fileName}</span>
          </div>
          <button className="btn-send" onClick={handleSendImage} disabled={disabled} aria-label="Enviar imagen" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </>
      )}

      {/* Modo normal (texto) */}
      {!inRecordingMode && !inImageMode && (
        <>
          <button
            className="btn-icon-sm btn-attach"
            onClick={handleImageButtonClick}
            disabled={disabled}
            aria-label="Adjuntar imagen"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            className="chat-input"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu mensaje..."
            disabled={disabled}
            rows={1}
            aria-label="Mensaje"
            aria-multiline="true"
            autoComplete="off"
            autoCorrect="on"
            spellCheck="true"
          />

          {hasText ? (
            <button
              className="btn-send"
              onClick={handleSendText}
              disabled={!canSendText}
              aria-label="Enviar mensaje"
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          ) : (
            <button
              className="btn-send btn-send--mic"
              onClick={handleMicClick}
              disabled={disabled}
              aria-label="Grabar audio"
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          )}
        </>
      )}

      {/* Error de micrófono */}
      {audioError && (
        <div className="audio-error" role="alert">
          {audioError}
          <button onClick={() => setAudioError(null)} aria-label="Cerrar" style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}
    </div>
  )
}
