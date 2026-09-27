import { useCallback, useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { BootGate } from '@/components/BootGate'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { useSmoothScroll, useScrollToTopOnNavigate } from '@/hooks/useSmoothScroll'
import { useForceStatic, useReducedMotion } from '@/hooks/useEnvironment'
import { Home } from '@/pages/Home'
import { Work } from '@/pages/Work'
import { CaseStudy } from '@/pages/CaseStudy'
import { Lab } from '@/pages/Lab'
import { About } from '@/pages/About'
import { Contact } from '@/pages/Contact'
import { NotFound } from '@/pages/NotFound'
import { ScrollProgress } from '@/components/ScrollProgress'

export default function App() {
  const reduced = useReducedMotion()
  const forcedStatic = useForceStatic()
  // One flag decides motion for the whole app: no Lenis, no pinning, no loop.
  const motion = !reduced && !forcedStatic
  const lenis = useSmoothScroll(motion)
  useScrollToTopOnNavigate()
  const location = useLocation()
  const [booted, setBooted] = useState(false)
  const onBootDone = useCallback(() => setBooted(true), [])

  // Route change: reset the scene's sense of "where am I", and make sure a
  // restored scroll position does not leave the new page mid-transition.
  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true })
  }, [location.pathname, lenis])

  return (
    <>
      <BootGate onDone={onBootDone} />
      <div className="app" data-booted={booted} data-motion={motion}>
        <ScrollProgress enabled={motion} />
        <Header />
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Home motion={motion} />} />
            <Route path="/work" element={<Work motion={motion} />} />
            <Route path="/work/:slug" element={<CaseStudy motion={motion} />} />
            <Route path="/lab" element={<Lab motion={motion} />} />
            <Route path="/about" element={<About motion={motion} />} />
            <Route path="/contact" element={<Contact motion={motion} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </>
  )
}
