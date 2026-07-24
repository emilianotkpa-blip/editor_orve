import { AnimatePresence, m } from 'motion/react'
import { useLandingStore } from '../../store/useLandingStore'
import { POP, toast as toastVariants } from '../../lib/motion'

export function Toast() {
  const { toast, dismissToast } = useLandingStore()
  const ok = toast?.type === 'success'

  return (
    <AnimatePresence>
      {toast && (
        <m.div
          key="toast"
          onClick={dismissToast}
          variants={toastVariants} initial="initial" animate="animate" exit="exit"
          transition={POP}
          style={{
            position: 'fixed', bottom: 56, left: '50%',
            zIndex: 9999, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            background: ok ? 'rgba(20,38,22,.97)' : 'rgba(40,18,18,.97)',
            border: `1px solid ${ok ? 'rgba(56,208,48,.5)' : 'rgba(255,107,107,.5)'}`,
            color: '#fff', fontFamily: 'Mulish, sans-serif',
            fontSize: 14, fontWeight: 700,
            padding: '12px 18px', borderRadius: 10,
            boxShadow: '0 10px 36px rgba(0,0,0,.55)',
          }}
        >
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...POP, delay: 0.04 }}
            style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: ok ? '#38D030' : '#FF6B6B',
              color: ok ? '#063800' : '#3a0000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 900,
            }}
          >
            {ok ? '✓' : '!'}
          </m.span>
          {toast.message}
        </m.div>
      )}
    </AnimatePresence>
  )
}
