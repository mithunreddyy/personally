import { AnimatePresence, motion } from 'motion/react';
import { CSSProperties, ReactNode, useId, useState } from 'react';
import { Link } from 'react-router-dom';

const appear = (delay: number) => ({ '--appear-delay': `${delay}ms` }) as CSSProperties;

/** A muted label over its content: the one section shape every page uses */
export function Section({
  id,
  title,
  action,
  delay = 0,
  children,
}: {
  id?: string;
  title: ReactNode;
  /** Quiet link on the right of the label, e.g. "All" */
  action?: ReactNode;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="appear pb-10 flex flex-col gap-3.5 scroll-mt-6"
      style={appear(delay)}
    >
      {action ? (
        <div className="flex items-baseline justify-between gap-4">
          <h2 id={id ? `${id}-title` : undefined} className="text-muted font-normal">
            {title}
          </h2>
          {action}
        </div>
      ) : (
        <h2 id={id ? `${id}-title` : undefined} className="text-muted font-normal">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

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

/** Below 480px the right-hand details leave the columns and join one quiet line under the entry */
export function PhoneMeta({ parts }: { parts: ReactNode[] }) {
  const shown = parts.filter(Boolean);
  if (!shown.length) return null;
  return (
    // A span, not a p, so it is valid inside the Experience toggle button
    <span className="block min-[480px]:hidden print:hidden mt-0.5 text-muted text-[14px] leading-[23px]">
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
    <div className="print:break-inside-avoid">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-ink min-w-0 print:text-black print:font-medium">{name}</span>
        {detail && <span className="text-muted text-[14px] leading-[23px] shrink-0 max-[479px]:hidden print:inline print:text-black/80">{detail}</span>}
      </div>
      {(sub || place) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-muted print:text-black/70">
          {sub && <span className="min-w-0">{sub}</span>}
          {place && <span className="text-[14px] leading-[23px] shrink-0 max-[479px]:hidden print:inline">{place}</span>}
        </div>
      )}
      <PhoneMeta parts={[detail, place]} />
    </div>
  );
}

/** Name on the left, quiet detail on the right; stacks under 360px, like the reference */
export function Row({ name, detail }: { name: ReactNode; detail?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] max-[359.98px]:grid-cols-1 items-baseline gap-x-4">
      <div className="min-w-0">{name}</div>
      {detail && (
        <div className="text-muted text-[14px] leading-[23px] text-right max-[359.98px]:text-left">
          {detail}
        </div>
      )}
    </div>
  );
}

export function RowList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1.5 max-[359.98px]:gap-2.5">{children}</div>;
}

/**
 * North-east arrow after a link, drawn like the shedsgns.me icon. It marks a link that leaves
 * the site (and project titles); the underline stays on the text, not the arrow.
 */
export function Arrow({ newTab = false }: { newTab?: boolean }) {
  return (
    <>
      {/* Takes no room at rest, so "GitHub." never reads "GitHub  ."; the box opens on hover or focus */}
      <span
        aria-hidden="true"
        className="inline-block w-0 group-hover:w-[0.92em] group-focus-visible:w-[0.92em] overflow-x-clip align-baseline whitespace-nowrap leading-none transition-[width] duration-200 motion-reduce:transition-none"
      >
        <svg
          viewBox="0 0 22 22"
          fill="none"
          className="inline-block w-[0.62em] h-[0.62em] ml-[0.3em] text-ink opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity motion-reduce:transition-none"
        >
          <path
            d="M3.14 18.86 17.38 4.62M18.86 18.86V7.96c0-2.66-2.16-4.82-4.82-4.82H3.14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {newTab && <span className="sr-only"> (opens in a new tab)</span>}
    </>
  );
}

/** Internal route or external URL, both wearing the hairline underline; external URLs get the arrow */
export function TextLink({ to, arrow, children }: { to: string; arrow?: boolean; children: ReactNode }) {
  const external = /^https?:/.test(to);
  const withArrow = arrow ?? external;
  const body = withArrow ? (
    <>
      <span className="link-line">{children}</span>
      <Arrow newTab={external} />
    </>
  ) : (
    children
  );
  const className = withArrow ? 'group' : 'link-line';

  if (external || to.startsWith('mailto:')) {
    return (
      <a href={to} className={className} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {body}
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      {body}
    </Link>
  );
}

export { appear };
