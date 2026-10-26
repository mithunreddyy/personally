import { AnimatePresence, motion } from 'motion/react';
import { CSSProperties, ReactNode, useId, useState } from 'react';
import { Link } from 'react-router-dom';

const appear = (delay: number) => ({ '--appear-delay': `${delay}ms` }) as CSSProperties;

/** A labelled block under a hairline divider: the one section shape every page uses */
export function Section({
  id,
  title,
  delay = 0,
  children,
}: {
  id?: string;
  title: ReactNode;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="appear border-t border-line pt-3.5 pb-6 flex flex-col gap-3.5 scroll-mt-6"
      style={appear(delay)}
    >
      <h2 id={id ? `${id}-title` : undefined} className="text-muted font-normal">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A Section whose label is a "+" toggle; the body stays folded until asked for */
export function CollapsibleSection({ title, delay = 0, children }: { title: string; delay?: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <section className="appear border-t border-line pt-3.5 pb-4" style={appear(delay)}>
      <h2 className="font-normal">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="group w-full flex items-baseline justify-between gap-3 text-left text-muted"
        >
          <span>{title}</span>
          <span
            aria-hidden="true"
            className={`inline-block transition-transform duration-300 group-hover:text-ink ${open ? 'rotate-45' : ''}`}
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
            className="overflow-hidden"
          >
            <div className="pt-3.5 pb-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Below 480px the right-hand details leave the columns and join one quiet line under the entry */
export function PhoneMeta({ parts }: { parts: ReactNode[] }) {
  const shown = parts.filter(Boolean);
  if (!shown.length) return null;
  return (
    // A span, not a p, so it is valid inside the Experience toggle button
    <span className="block min-[480px]:hidden mt-0.5 text-muted text-[15px] leading-[22px]">
      {shown.map((part, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {part}
        </span>
      ))}
    </span>
  );
}

/** Two-line CV entry: name and detail on top, a muted line and place beneath */
export function Entry({
  name,
  detail,
  sub,
  place,
}: {
  name: ReactNode;
  detail?: ReactNode;
  sub?: ReactNode;
  place?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-ink min-w-0">{name}</span>
        {detail && <span className="text-muted shrink-0 max-[479px]:hidden">{detail}</span>}
      </div>
      {(sub || place) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-muted">
          {sub && <span className="min-w-0">{sub}</span>}
          {place && <span className="shrink-0 max-[479px]:hidden">{place}</span>}
        </div>
      )}
      <PhoneMeta parts={[detail, place]} />
    </div>
  );
}

/** Name on the left, quiet detail on the right; stacks on narrow phones */
export function Row({ name, detail }: { name: ReactNode; detail?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] max-[479px]:grid-cols-1 items-baseline gap-x-4">
      <div className="min-w-0">{name}</div>
      {detail && (
        <div className="text-muted text-right max-[479px]:text-left max-[479px]:text-[15px] max-[479px]:leading-[22px]">
          {detail}
        </div>
      )}
    </div>
  );
}

export function RowList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1.5 max-[479px]:gap-2.5">{children}</div>;
}

/** Internal route or external URL, both wearing the hairline underline */
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  if (/^(https?:|mailto:)/.test(to)) {
    const external = to.startsWith('http');
    return (
      <a href={to} className="link-line" {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className="link-line">
      {children}
    </Link>
  );
}

export { appear };
