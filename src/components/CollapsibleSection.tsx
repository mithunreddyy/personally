import { AnimatePresence, motion } from 'motion/react';
import { ReactNode, useId, useState } from 'react';
import { appear } from './List';

// Kept out of List.tsx so the home page, which never folds anything, doesn't download Motion

/** A Section whose label is a "+" toggle; the body stays folded until asked for */
export function CollapsibleSection({ title, delay = 0, children }: { title: string; delay?: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <section className="appear pb-4 print:pb-2 print:break-inside-avoid" style={appear(delay)}>
      <h2 className="font-normal">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="group w-full flex items-baseline justify-between gap-3 text-left text-muted print:text-black"
        >
          <span className="print:font-medium print:text-black">{title}</span>
          <span
            aria-hidden="true"
            className={`inline-block transition-transform duration-300 group-hover:text-ink print:hidden ${open ? 'rotate-45' : ''}`}
          >
            +
          </span>
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden print:hidden"
          >
            <div className="pt-3.5 pb-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hidden print:block pt-2 pb-1">
        {children}
      </div>
    </section>
  );
}
