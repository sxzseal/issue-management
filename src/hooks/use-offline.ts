import { useEffect, useState } from 'react'

/**
 * Track browser online/offline. Server-driven detection is out of scope for v1.
 * Subscribes to window online/offline events; on the very first mount reads
 * navigator.onLine.
 */
export function useOffline(): boolean {
  const [offline, setOffline] = useState<boolean>(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return offline
}
