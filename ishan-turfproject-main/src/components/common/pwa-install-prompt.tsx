import { useState, useEffect, useCallback } from 'react'
import { Download, X, Share, Plus, Smartphone, CheckCircle, Info, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// Standard BeforeInstallPromptEvent (not yet in lib.dom.d.ts)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

const STORAGE_KEY = 'elite-arena-pwa-prompt-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function isRunningAsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
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
  const [isInstalled, setIsInstalled] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)

  useEffect(() => {
    // Check initial standalone status
    if (isRunningAsStandalone()) {
      setIsInstalled(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setShowGuideModal(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    const handleManualTrigger = () => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // silent fallback
      }
      setIsIOSDevice(isIOS())
      if (isRunningAsStandalone()) {
        setIsInstalled(true)
      }
      setShowBanner(true)
    }

    window.addEventListener('trigger-pwa-install', handleManualTrigger)

    // Don't auto-show if already installed or dismissed recently
    if (isRunningAsStandalone() || wasDismissedRecently()) {
      return () => {
        window.removeEventListener('trigger-pwa-install', handleManualTrigger)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }

    const ios = isIOS()
    setIsIOSDevice(ios)

    if (ios) {
      // iOS Safari: no beforeinstallprompt — show manual prompt after 3s
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('trigger-pwa-install', handleManualTrigger)
        window.removeEventListener('appinstalled', handleAppInstalled)
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
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      // If native browser prompt is not captured yet, open interactive guide modal
      setShowGuideModal(true)
      return
    }
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setShowBanner(false)
        setShowGuideModal(false)
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err)
      setShowGuideModal(true)
    } finally {
      setInstalling(false)
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowBanner(false)
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch {
      // localStorage unavailable
    }
  }, [])

  return (
    <>
      {showBanner && (
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
            width: 'min(92vw, 440px)',
            animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}
        >
          <style>{`
            @keyframes slideUpFade {
              from { opacity: 0; transform: translateX(-50%) translateY(20px); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>

          <div
            style={{
              background: 'rgba(9, 9, 11, 0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(22, 163, 74, 0.4)',
              borderRadius: '1.25rem',
              padding: '1.15rem 1.15rem 1.15rem 1rem',
              boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(22,163,74,0.15)',
              display: 'flex',
              gap: '0.875rem',
              alignItems: 'flex-start',
            }}
          >
            {/* App Icon */}
            <div
              style={{
                flexShrink: 0,
                width: 50,
                height: 50,
                borderRadius: '0.875rem',
                overflow: 'hidden',
                border: '1.5px solid rgba(22, 163, 74, 0.5)',
                boxShadow: '0 0 16px rgba(22,163,74,0.3)',
              }}
            >
              <img
                src="/apple-touch-icon.jpg"
                alt="Elite Arena"
                width={50}
                height={50}
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
                }}
              >
                {isInstalled ? 'Elite Arena App Installed' : 'Install Elite Arena App'}
              </p>

              {isInstalled ? (
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.8125rem', color: '#4ade80' }}>
                  <CheckCircle size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  Running as Home Screen App
                </p>
              ) : isIOSDevice ? (
                <p style={{ margin: '0.35rem 0 0.75rem', fontSize: '0.8125rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Tap <Share size={12} style={{ display: 'inline', color: '#16a34a' }} /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>
                </p>
              ) : (
                <p style={{ margin: '0.35rem 0 0.75rem', fontSize: '0.8125rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                  Add to Phone Home Screen for fast offline access & native app feel.
                </p>
              )}

              {/* Actions */}
              {!isInstalled && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    id="pwa-install-btn"
                    onClick={handleInstall}
                    disabled={installing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem 0.875rem',
                      borderRadius: '0.625rem',
                      border: 'none',
                      background: installing
                        ? 'rgba(22, 163, 74, 0.5)'
                        : 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: installing ? 'default' : 'pointer',
                    }}
                  >
                    <Download size={14} />
                    {installing ? 'Installing…' : deferredPrompt ? 'Install App' : 'How to Install'}
                  </button>

                  <button
                    onClick={() => setShowGuideModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.625rem',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#d4d4d8',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Info size={13} />
                    Guide
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
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Visual Guide Modal for direct step-by-step PWA install */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-[92vw] max-w-lg p-5 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
              How to Install Elite Arena App
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs sm:text-sm pt-1">
              Follow these simple steps to add the Elite Arena app icon directly to your Phone Home Screen & Apps list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs sm:text-sm">
            {/* Android / Chrome section */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <span>📱 Android (Chrome / Edge / Samsung)</span>
              </div>
              <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed">
                <li>
                  Tap browser menu <strong className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">⋮</strong> in top right corner.
                </li>
                <li>
                  Select <strong className="text-emerald-300">"Install app"</strong> or <strong className="text-emerald-300">"Add to Home screen"</strong>.
                </li>
                <li>
                  Tap <strong className="text-white">Install</strong> to confirm. The app icon will be added to your mobile home screen & app drawer.
                </li>
              </ol>
            </div>

            {/* iPhone / Safari section */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <span>🍎 iPhone / iPad (Safari)</span>
              </div>
              <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed">
                <li>
                  Tap the <strong className="text-white">Share button</strong> <Share className="inline w-3.5 h-3.5 text-emerald-400" /> at bottom of Safari.
                </li>
                <li>
                  Scroll down the menu and tap <strong className="text-emerald-300">"Add to Home Screen"</strong>.
                </li>
                <li>
                  Tap <strong className="text-white">Add</strong> in the top-right corner.
                </li>
              </ol>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setShowGuideModal(false)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full sm:w-auto"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

