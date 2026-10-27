---
title: "Advanced TypeScript Patterns for Large Scale React Applications"
date: 2024-01-15
category: "Web Development"
excerpt: "Deep dive into conditional types, utility types, and polymorphic component design to ensure absolute type safety without developer friction."
published: true
---

TypeScript is more than just interfaces and types. When working on large-scale applications, leveraging mapped types and template literal types can significantly reduce boilerplate while catching subtle regressions at compile time.

Polymorphic Component Props:

One common pattern is creating polymorphic components (like a button that can render as an `<a>` or `<button>`) with full type safety:

```typescript
type AsProp<C extends React.ElementType> = {
  as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

// Polymorphic component prop with strict discrimination across intrinsic elements and ref forwarding
type PolymorphicComponentProp<C extends React.ElementType, Props = {}> = React.PropsWithChildren<Props & AsProp<C>> & Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;
```

Strict Event Handlers:

Another useful pattern is discriminating union props to enforce contextual parameters without `any` casts:

```typescript
type ActionPayload =
  | { type: 'NAVIGATE'; path: string; replaceHistory?: boolean; state?: Record<string, unknown> }
  | { type: 'NOTIFY'; message: string; duration?: number; level?: 'info' | 'warning' | 'error' }
  | { type: 'TRACK_EVENT'; eventName: string; properties?: Record<string, string | number | boolean> }
  | { type: 'SET_THEME'; mode: 'light' | 'dark' | 'system'; persistPreference?: boolean }
  | { type: 'REFRESH_SESSION'; forceTokenRenewal?: boolean }
  | { type: 'RESET' };

function dispatchAction(action: ActionPayload) {
  switch (action.type) {
    case 'NAVIGATE':
      return console.log(`Navigating to ${action.path} (replace: ${Boolean(action.replaceHistory)})`);
    case 'NOTIFY':
      return console.log(`[${action.level ?? 'info'}] ${action.message} (${action.duration ?? 3000}ms)`);
    case 'TRACK_EVENT':
      return console.log(`Analytics event: ${action.eventName}`, action.properties);
    case 'SET_THEME':
      return console.log(`Setting theme mode: ${action.mode}`);
    case 'REFRESH_SESSION':
      return console.log(`Session refresh requested (force: ${Boolean(action.forceTokenRenewal)})`);
    case 'RESET':
      return console.log('Resetting global application state');
  }
}
```

Key Takeaways:

• Use `Extract<T, U>` and `Exclude<T, U>` over repeated union declarations.
• Prefer template literal types like `type Route = \`/\${string}\`` for route definitions.
• Check out the official [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) for latest compiler options.
