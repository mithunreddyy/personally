import { Fragment } from 'react';

import { CaseBlock } from '../types';

/**
 * A case study's write-up, set as text. One block in, one block out: prose paragraphs, run-in paragraphs
 * for the bullet lists (an ink lead-in before the colon, no markers), and measured figures. Inside the
 * text, `code` and source references ([1]) are recognised
 */
export function Block({ block }: { block: CaseBlock }) {
  if (block.kind === 'text') {
    return (
      <p>
        <Inline text={block.text} />
      </p>
    );
  }
  if (block.kind === 'rows') {
    // Measured figures: the number reads first, in ink, with what was measured beside it
    return (
      <dl className="case-figures">
        {block.rows.map(row => (
          <div key={row.label}>
            <dd>{row.value}</dd>
            <dt>{row.label}</dt>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <ul className="case-runin">
      {block.items.map(line => (
        <li key={line}>
          <RunIn line={line} />
        </li>
      ))}
    </ul>
  );
}

/** `code` spans, and [n] as a link to source n at the end of the page */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\s?\[\d+\])/).map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="case-code">
              {part.slice(1, -1)}
            </code>
          );
        }
        const ref = part.match(/^\s?\[(\d+)\]$/);
        if (ref) {
          return (
            <sup key={i} className="case-ref">
              <a href={`#source-${ref[1]}`} aria-label={`Source ${ref[1]}`}>
                {ref[1]}
              </a>
            </sup>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/**
 * "The clover dial: hold ⌥ while…" reads with its lead-in in ink as a run-in head, so the list scans by
 * topic. Lines without a short lead before a colon are plain paragraphs
 */
function RunIn({ line }: { line: string }) {
  const at = line.indexOf(': ');
  if (at <= 0 || at > 48) return <Inline text={line} />;
  return (
    <>
      <span className="case-runin-head">{line.slice(0, at)}.</span> <Inline text={upper(line.slice(at + 2))} />
    </>
  );
}

// After a run-in head the sentence starts fresh
const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
