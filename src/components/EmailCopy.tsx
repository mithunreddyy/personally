import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** Mail link with a small copy button beside it, kept on one line */
export function EmailCopy({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Clipboard blocked: leave the icon unchanged rather than claim a copy
      return;
    }
    setCopied(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="whitespace-nowrap">
      <a href={`mailto:${email}`} className="link-line">
        {email}
      </a>
      <button
        type="button"
        onClick={copyEmail}
        aria-label={`Copy email address ${email}`}
        title="Copy email"
        className="inline-flex items-center justify-center w-8 h-8 -my-2 align-middle text-muted hover:text-ink transition-colors print:hidden"
      >
        {copied ? <Check size={16} className="text-accent" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      </button>
      <span role="status" className="sr-only">
        {copied ? 'Email copied to clipboard' : ''}
      </span>
    </span>
  );
}
