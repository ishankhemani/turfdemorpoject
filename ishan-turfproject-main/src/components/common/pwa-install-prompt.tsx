import { useState, useEffect, useCallback } from 'react'
import { Download, X, Share, Plus } from 'lucide-react'

// Standard BeforeInstallPromptEvent (not yet in lib.dom.d.ts)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

const STORAGE_KEY = 'elite-arena-pwa-prompt-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isRunningAsStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(STORAGE_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < DISMISS_DURATION_MS
  } catch {
    return false
  }
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const handleManualTrigger = () => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // silent fallback
      }
      setIsIOSDevice(isIOS())
      setShowBanner(true)
    }

    window.addEventListener('trigger-pwa-install', handleManualTrigger)

    // Don't auto-show if already installed or dismissed recently
    if (isRunningAsStandalone() || wasDismissedRecently()) {
      return () => window.removeEventListener('trigger-pwa-install', handleManualTrigger)
    }

    const ios = isIOS()
    setIsIOSDevice(ios)

    if (ios) {
      // iOS Safari: no beforeinstallprompt — just show manual instructions after 3s
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('trigger-pwa-install', handleManualTrigger)
      }
    }

    // Chrome/Edge/Android: capture install event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShowBanner(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('trigger-pwa-install', handleManualTrigger)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    } else {
      setInstalling(false)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowBanner(false)
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch {
      // localStorage unavailable — fail silently
    }
  }, [])

  if (!showBanner) return null

  return (
    <div
      role="dialog"
      aria-label="Install Elite Arena app"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'min(92vw, 420px)',
        animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      {/* Inject keyframe once */}
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div
        style={{
          background: 'rgba(9, 9, 11, 0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(22, 163, 74, 0.35)',
          borderRadius: '1.25rem',
          padding: '1.25rem 1.25rem 1.25rem 1rem',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(22,163,74,0.1)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        {/* App Icon */}
        <div
          style={{
            flexShrink: 0,
            width: 52,
            height: 52,
            borderRadius: '0.875rem',
            overflow: 'hidden',
            border: '1.5px solid rgba(22, 163, 74, 0.4)',
            boxShadow: '0 0 16px rgba(22,163,74,0.25)',
          }}
        >
          <img
            src="/apple-touch-icon.jpg"
            alt="Elite Arena"
            width={52}
            height={52}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: '#f4f4f5',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            Add Elite Arena to Home Screen
          </p>

          {isIOSDevice ? (
            <p
              style={{
                margin: '0.35rem 0 0.9rem',
                fontSize: '0.8125rem',
                color: '#a1a1aa',
                lineHeight: 1.5,
              }}
            >
              Tap{' '}
              <Share
                size={12}
                style={{ display: 'inline', verticalAlign: 'middle', color: '#16a34a' }}
              />{' '}
              <strong style={{ color: '#d4d4d8' }}>Share</strong>, then{' '}
              <Plus
                size={12}
                style={{ display: 'inline', verticalAlign: 'middle', color: '#16a34a' }}
              />{' '}
              <strong style={{ color: '#d4d4d8' }}>Add to Home Screen</strong>
            </p>
          ) : (
            <p
              style={{
                margin: '0.35rem 0 0.9rem',
                fontSize: '0.8125rem',
                color: '#a1a1aa',
                lineHeight: 1.5,
              }}
            >
              Install for offline access, faster loads &amp; a native app experience.
            </p>
          )}

          {/* Actions */}
          {!isIOSDevice && (
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button
                id="pwa-install-btn"
                onClick={handleInstall}
                disabled={installing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.625rem',
                  border: 'none',
                  background: installing
                    ? 'rgba(22, 163, 74, 0.5)'
                    : 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: installing ? 'default' : 'pointer',
                  transition: 'opacity 0.2s, transform 0.1s',
                  letterSpacing: '-0.01em',
                }}
                onMouseDown={(e) => ((e.currentTarget.style.transform = 'scale(0.97)'))}
                onMouseUp={(e) => ((e.currentTarget.style.transform = 'scale(1)'))}
              >
                <Download size={14} />
                {installing ? 'Installing…' : 'Install App'}
              </button>

              <button
                id="pwa-dismiss-btn"
                onClick={handleDismiss}
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '0.625rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#71717a',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Not now
              </button>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          id="pwa-close-btn"
          onClick={handleDismiss}
          aria-label="Close install prompt"
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#71717a',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
