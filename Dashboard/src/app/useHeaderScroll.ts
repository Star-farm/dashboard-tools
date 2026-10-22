import { useEffect, useState } from 'react'

export function useHeaderScroll(paused = false) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let anchorY = Math.max(0, window.scrollY)
    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY)
      if (paused) {
        anchorY = currentY
        return
      }
      const distance = currentY - anchorY
      if (currentY <= 24 || distance <= -8) {
        setHidden(false)
        anchorY = currentY
      } else if (distance >= 12) {
        setHidden(true)
        anchorY = currentY
      }
    }
    const onNavigate = () => {
      anchorY = Math.max(0, window.scrollY)
      setHidden(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('hashchange', onNavigate)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', onNavigate)
    }
  }, [paused])

  return { hidden: !paused && hidden, showHeader: () => setHidden(false) }
}
