import { appear, TextLink } from './List';
import { LostWalker } from './LostWalker';
import { SEO } from './SEO';

export function NotFound() {
  return (
    <section aria-label="Page not found" className="flex flex-col gap-3">
      <SEO title="Not found" description="This page does not exist." noindex />
      <LostWalker className="appear mb-3" />
      <h1 className="appear text-muted font-normal tabular-nums" style={appear(0)}>
        404
      </h1>
      <p className="appear text-body" style={appear(40)}>
        Nothing lives at this address. It moved, or it was never here.
      </p>
      <p className="appear text-body" style={appear(80)}>
        Head <TextLink to="/">back to the index</TextLink>.
      </p>
    </section>
  );
}
