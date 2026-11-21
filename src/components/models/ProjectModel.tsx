import { Component, ComponentType, ReactNode, Suspense, lazy, useState } from 'react';

// Each project's working model, loaded only on its own case study
const LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  nook: () => import('./NookModel').then(m => ({ default: m.NookModel })),
  sieve: () => import('./SieveModel').then(m => ({ default: m.SieveModel })),
  dropster: () => import('./DropsterModel').then(m => ({ default: m.DropsterModel })),
};

export const hasModel = (id: string) => id in LOADERS;

// lazy() remembers a failed load for good, so Try again starts from a fresh one
const VIEWS: Record<string, ReturnType<typeof lazy>> = {};
const viewFor = (id: string) => (VIEWS[id] ??= lazy(LOADERS[id]));

class ModelBoundary extends Component<{ id: string; onRetry: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    delete VIEWS[this.props.id];
    console.error(`[model] ${this.props.id} failed`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="text-muted" role="status">
        The model didn’t load.{' '}
        <button type="button" className="link-line" onClick={this.props.onRetry}>
          Try again
        </button>
      </p>
    );
  }
}

export function ProjectModel({ id, title }: { id: string; title: string }) {
  const [attempt, setAttempt] = useState(0);
  if (!hasModel(id)) return null;
  const View = viewFor(id);
  return (
    <ModelBoundary key={attempt} id={id} onRetry={() => setAttempt(a => a + 1)}>
      <Suspense fallback={<p className="text-muted model-loading">Loading the {title} model</p>}>
        <View />
      </Suspense>
    </ModelBoundary>
  );
}
