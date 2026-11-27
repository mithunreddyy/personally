---
title: "pages that remember"
date: 2026-11-12
category: "Design"
excerpt: "Websites have always cut from one page to the next like a film with no editor. View transitions let the browser keep track of where things were, so a thumbnail can grow into the page it opens."
published: true
---

Film editors have a word for a cut that keeps your eye in the right place: continuity. A cup in the actor's left hand in one shot is still in the left hand in the next. When an editor gets it wrong, you feel a jolt even if you can't say why.

The web has been cutting without continuity for thirty years. Tap a product photo and the screen goes white for a moment, then a new page appears with the same photo somewhere else, at another size. Your eye has to find it again.

Apps fixed this long ago with shared-element transitions, where the thumbnail itself grows into the hero image of the next screen. On the web it took a framework, a lot of JavaScript and some luck. The View Transitions API makes it a browser feature.

## the trick: two photographs

The browser does it with snapshots. When you start a transition, it:

1. takes a picture of the page as it is now,
2. lets your code change the page however it likes,
3. takes a picture of the new state,
4. animates from the first picture to the second.

By default the animation is a short crossfade. Your code doesn't have to know anything about the animation, it only makes the change.

```js
document.startViewTransition(() => {
  showProduct(id); // swap the content however you already do
});
```

## naming the things that should travel

A crossfade is pleasant. The magic is in telling the browser that two elements are the same thing. Give them the same `view-transition-name` and the browser stops fading them and moves one into the place of the other, animating its position and size.

```css
.thumbnail.selected { view-transition-name: product-photo; }
.product-hero       { view-transition-name: product-photo; }
```

Now the photo you tapped slides and grows into the big photo on the product view, while everything else fades around it. That's continuity: your eye never loses the thing it was looking at.

Each named element becomes a set of pseudo-elements, such as `::view-transition-old(product-photo)` and `::view-transition-new(product-photo)`, which you can style with ordinary CSS animations if the defaults aren't right.

## across real page loads

The first version worked inside a single page, which suited apps built with React and similar frameworks. Cross-document transitions bring the same effect to plain multi-page sites, with no JavaScript at all. Both pages opt in with one rule:

```css
@view-transition {
  navigation: auto;
}
```

When you follow a link to another page on the same site, the browser carries the snapshot across the navigation and plays the transition on the new page. A static blog can now move like an app.

## where it works

Same-document transitions work in Chrome and Edge from version 111, Safari 18 and Firefox 144, so every major engine has them. Cross-document transitions arrived in Chrome 126 and Safari 18.2. Browsers without support just change the page instantly, which is what they did anyway, so it's safe to add today.

The API keeps growing. Chrome 147 added transitions scoped to a single element, so several parts of a page can run their own transitions at the same time instead of the whole document taking turns.

## using it with care

Motion that helps you keep your place is useful, and motion for show gets tiring by the third click. A few habits keep it on the right side:

- **Move one thing.** Pick the element the person was looking at and let it travel. If everything moves, nothing reads as continuous.
- **Keep it short.** Around a quarter of a second feels like the page responding. Much longer feels like waiting.
- **Respect reduced motion.** Some people get dizzy from movement on screen.

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*) { animation: none; }
}
```

Done well, people won't notice the transition at all. They'll just feel that the site never makes them look for things.

## sources

- [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), MDN
- [Smooth transitions with the View Transition API](https://developer.chrome.com/docs/web-platform/view-transitions), Chrome for Developers
- [Web platform features, April 2026 release notes](https://web-platform-dx.github.io/web-features-explorer/release-notes/april-2026), web-features explorer
