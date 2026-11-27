---
title: "the shape of a corner"
date: 2026-11-16
category: "Design"
excerpt: "For twenty years every rounded corner on the web has been a slice of a circle. A new CSS property, corner-shape, finally lets a corner be a squircle, a bevel, a notch or a scoop."
published: true
---

Put a coin next to the corner of your phone. The coin's edge is a circle: it bends at the same rate all the way round. The phone's corner doesn't. It starts bending gently where the straight edge ends, tightens through the middle, and eases off again. Your eye can't name the difference, but it notices. One looks stamped out and the other looks moulded.

That smoother curve is often called a squircle, and for as long as CSS has had `border-radius`, the web couldn't draw one. Every rounded corner on every site has been a quarter of a circle or an ellipse. A new property, `corner-shape`, changes that.

## what border-radius actually draws

`border-radius: 16px` cuts each corner along a circular arc with a 16px radius. Where the arc meets the straight edge, the curvature jumps from zero to its full amount in a single point. On a small button nobody sees it. On a large card, a photo or an app icon, that jump is the faint seam that makes a circular corner look slightly flat.

Designers have spent years faking smoother corners with SVG masks, `clip-path` polygons and images. All of them break something, usually borders, shadows or the ability to resize.

## what corner-shape adds

`corner-shape` doesn't replace `border-radius`, it works with it. The radius still decides how big the corner is, and `corner-shape` decides what curve fills that space. Without a radius, it does nothing.

```css
.card {
  border-radius: 28px;
  corner-shape: squircle;
}
```

The keywords:

- `round` is today's circular corner, the default.
- `squircle` is the smooth, phone-like curve.
- `bevel` cuts the corner with a straight line.
- `scoop` curves inward, like a bite taken out of the corner.
- `notch` cuts a square step into the corner.
- `square` ignores the radius and keeps a sharp corner.

You can set each corner on its own, too: `corner-shape: bevel round scoop squircle;` goes clockwise from the top left, the same order as `border-radius`.

## the dial behind the keywords

All of those keywords are points on one curve family, the superellipse, and you can reach any point on it with `superellipse()`. The number inside is a dial.

```
superellipse(-infinity)  notch
superellipse(-1)         scoop
superellipse(0)          bevel
superellipse(1)          round
superellipse(2)          squircle
superellipse(infinity)   square
```

Values above 1 pull the curve out toward a sharp corner, values between 0 and 1 flatten it toward a straight cut, and values below 0 push it inward. The numbers in between are where a brand can find a corner of its own, a bit softer than a squircle or a bit firmer than round.

## how to use it today

As of March 2026, Smashing Magazine reported `corner-shape` only in Chrome 139 and later and other Chromium browsers. So treat it as an enhancement and keep a corner that looks fine without it.

```css
.card { border-radius: 20px; }

@supports (corner-shape: squircle) {
  .card {
    border-radius: 28px;
    corner-shape: squircle;
  }
}
```

Note the larger radius inside `@supports`. A squircle hugs the corner more tightly than a circle at the same radius, so it looks smaller, and a larger number makes it look about the same size.

## where it earns its place

A corner is one of the few shapes that shows up on almost every surface of an interface, so it does a lot of quiet brand work. A few places it pays off:

- **Large surfaces**, like cards, sheets and media frames, where the circular seam is easiest to see.
- **Icons and avatars** that sit next to native app icons and look slightly off beside them.
- **Shapes that carry meaning.** A bevelled tag can read as a label and a notched ticket as a stub, without an extra SVG.

And one place to hold back: mixing four different corner shapes on one page reads as noise. Pick one shape, use it everywhere it fits, and let the consistency do the work. A corner is only noticed when it's inconsistent.

## sources

- [Beyond border-radius: what the CSS corner-shape property unlocks for everyday UI](https://www.smashingmagazine.com/2026/03/beyond-border-radius-css-corner-shape-property-ui/), Smashing Magazine, 12 March 2026
- [What's new in web UI](https://developer.chrome.com/blog/new-in-web-ui-io26), Chrome for Developers, 1 July 2026
- [corner-shape](https://developer.mozilla.org/en-US/docs/Web/CSS/corner-shape), MDN
