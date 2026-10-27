import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render errors anywhere in the tree and shows a recovery screen
 * instead of a blank white page. The user can reload to try again.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in dev; in production this would go to a reporting service
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-ink px-5">
        <div className="max-w-[400px] text-center flex flex-col gap-4">
          <p className="text-muted">Something went wrong rendering this page.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="link-line mx-auto"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
