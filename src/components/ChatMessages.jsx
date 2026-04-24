import React, { useEffect, useRef, useState } from 'react'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AudioPlayer({ src }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress(audio.currentTime / audio.duration)
  }

  function handleLoadedMetadata() {
    setDuration(audioRef.current?.duration || 0)
  }

  function handleEnded() {
    setPlaying(false)
    setProgress(0)
  }

  function handleSeek(e) {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    audio.currentTime = (x / rect.width) * audio.duration
  }

  function formatDur(s) {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        className="audio-play-btn"
        onClick={togglePlay}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        type="button"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        )}
      </button>
      <div className="audio-progress-wrap" onClick={handleSeek} onTouchStart={handleSeek} role="slider" aria-label="Progreso del audio" aria-valuenow={Math.round(progress * 100)}>
        <div className="audio-progress-bar">
          <div className="audio-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <span className="audio-duration">{formatDur(duration)}</span>
    </div>
  )
}

const URL_REGEX = /https?:\/\/[^\s<>"]+[^\s<>".,!?;:)]/g

function renderText(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, li) => {
    const parts = []
    let last = 0
    let match
    URL_REGEX.lastIndex = 0
    while ((match = URL_REGEX.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index))
      parts.push(
        <a key={match.index} href={match[0]} target="_blank" rel="noopener noreferrer" className="message-link">
          {match[0]}
        </a>
      )
      last = match.index + match[0].length
    }
    if (last < line.length) parts.push(line.slice(last))
    return (
      <React.Fragment key={li}>
        {parts}
        {li < lines.length - 1 && <br />}
      </React.Fragment>
    )
  })
}

function MessageBubble({ message, onButtonClick }) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const bubbleClass = isError ? 'error' : isUser ? 'user' : 'bot'

  function handleButtonClick(btn) {
    if (btn.type === 'url') {
      window.open(btn.url, '_blank', 'noopener,noreferrer')
    } else if (btn.type === 'postback' && onButtonClick) {
      onButtonClick({ type: 'text', text: btn.value })
    }
  }

  return (
    <div className={`message-wrapper message-wrapper--${bubbleClass}`}>
      <div className={`message-bubble message-bubble--${bubbleClass}`}>

        {/* Imagen */}
        {message.type === 'image' && message.mediaData && (
          <img
            src={message.mediaData}
            alt="Imagen enviada"
            className="message-image"
            loading="lazy"
          />
        )}

        {/* Audio */}
        {message.type === 'audio' && message.mediaData && (
          <AudioPlayer src={message.mediaData} />
        )}

        {/* Texto (siempre que haya) */}
        {message.text ? (
          <span className={message.type !== 'text' ? 'message-caption' : undefined}>
            {renderText(message.text)}
          </span>
        ) : null}

        {!isError && (
          <div className="message-time">{formatTime(message.timestamp)}</div>
        )}
      </div>

      {/* Botones de respuesta rápida */}
      {!isUser && !isError && message.buttons && message.buttons.length > 0 && (
        <div className="message-buttons">
          {message.buttons.map((btn, i) => (
            <button
              key={i}
              className="message-btn"
              onClick={() => handleButtonClick(btn)}
              type="button"
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="typing-wrapper" aria-label="El bot está escribiendo" role="status">
      <div className="typing-bubble">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

export default function ChatMessages({ messages, isTyping, onButtonClick }) {
  const anchorRef = useRef(null)

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <main className="chat-messages" role="log" aria-live="polite" aria-label="Mensajes del chat">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onButtonClick={onButtonClick} />
      ))}
      {isTyping && <TypingIndicator />}
      <div className="messages-anchor" ref={anchorRef} />
    </main>
  )
}
