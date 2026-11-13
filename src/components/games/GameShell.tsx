import { ReactNode } from 'react';

import { Stage } from './useStage';

/** The Space keycap in a game's rules, as a real button: hold it like the key, or tab to it and hold Enter */
export function HoldKey({ stage, action }: { stage: Stage; action: string }) {
  return (
    <button
      ref={stage.keyRef}
      type="button"
      className="keycap keycap-hold"
      data-pressed={stage.pressed || undefined}
      aria-label={`Space: hold to ${action}`}
      {...stage.holdProps}
    >
      Space
    </button>
  );
}

/**
 * One game's frame: a muted meta line with the score on the right, the stage, a live result line,
 * then the rules. The stage is the control; its canvas is a picture of the state, the text says it
 */
export function GameShell({
  stage,
  label,
  meta,
  score,
  status,
  action,
  rules,
  keyAction,
}: {
  stage: Stage;
  /** Accessible name for the stage, saying what a press does right now */
  label: string;
  meta: ReactNode;
  score: ReactNode;
  status: ReactNode;
  /** A follow-up control after the status, such as "Play again" */
  action?: { text: string; run: () => void };
  rules: ReactNode;
  /** What holding Space does, for the keyboard hint after the rules */
  keyAction: string;
}) {
  return (
    <div className="game flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-muted tabular-nums">
        <span>{meta}</span>
        <span>{score}</span>
      </div>

      {stage.unsupported ? (
        <p className="text-muted">This browser can’t draw the canvas the game needs.</p>
      ) : (
        <button
          ref={stage.buttonRef}
          type="button"
          className="game-stage"
          aria-label={label}
          {...stage.holdProps}
        >
          <canvas ref={stage.canvasRef} aria-hidden="true" />
        </button>
      )}

      <p className="text-ink min-h-[23px]" role="status" aria-live="polite">
        {status}
        {action && (
          <>
            {status ? ' ' : ''}
            <button
              type="button"
              // The button leaves with the line it sits on, so focus moves to the stage for the next go
              onClick={() => {
                action.run();
                stage.focus();
              }}
              className="link-line"
            >
              {action.text}
            </button>
          </>
        )}
      </p>

      <p className="text-body text-pretty">
        {rules}
        {/* Keyboard hint: only where there's a mouse or trackpad, so phones and tablets don't offer a key they lack */}
        <span className="key-hint">
          {' '}
          Or hold <HoldKey stage={stage} action={keyAction} />.
        </span>
      </p>
    </div>
  );
}
