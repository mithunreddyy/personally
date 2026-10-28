---
title: "motivation is a cache"
date: 2026-10-28
category: "Life"
excerpt: "Motivation feels like the thing that gets work done, but it behaves like a cache: fast, pleasant, and often empty by morning. The work keeps going when it reads from something more durable."
published: true
---

Every engineer learns this the hard way at least once. You put a cache in front of a slow database, the app gets fast, and for a while you forget the database is even there. Then the cache expires at the worst possible moment, every request falls through to the slow path, and you find out what your system really runs on.

Motivation works the same way. On a good day it answers everything instantly. You want to write, so you write. You want to train, so you go. It feels like the wanting is what gets things done. Then one Tuesday the cache is empty, and you learn what you actually run on.

This post is about building the slow path on purpose, so the empty Tuesdays stop being a crisis.

## the cache will expire

Motivation is a feeling, and feelings have a short time to live. A bad night's sleep, a grey sky, a sharp message, a meeting that ran long: any of them can clear it. Nothing is wrong with you when that happens. Caches expire. That is their whole job.

The mistake is planning your days as if the cache never misses. "I'll work on it when I feel ready" is a system with no fallback. It runs beautifully in the demo and falls over in production.

So the first move is small and slightly boring: expect the miss. Decide now what you'll do on the days you don't feel like it, while you still feel like deciding.

## find your source of truth

If motivation is the cache, what is the database? It is whatever still exists when you feel nothing at all.

- **A fixed time.** "After lunch, I write" survives a bad mood far better than "when I'm inspired".
- **A fixed place.** The same chair, the same tab, the same playlist. After a while, the setting itself tells your head it's time to work.
- **A visible record.** A plain list of the days you showed up. It doesn't care how you felt, only whether you did.

None of these are exciting, and they shouldn't be. A source of truth is meant to be dull and dependable. You query it when the fast layer has nothing to give you.

## make the slow path cheap

When the cache misses, the request goes to the slow path. If the slow path hurts, you'll avoid it, and avoidance is where whole weeks quietly disappear.

So make the fallback almost embarrassingly small. Instead of "write a chapter", open the document and write one sentence. Instead of "an hour at the gym", put on your shoes and walk to the door.

```ts
function startWork(task: Task, mood: Mood) {
  // mood is an input, not a precondition
  const step = task.smallestVersion(); // one sentence, one push-up, one commit
  return step.start();
}
```

More often than you'd expect, starting the smallest version warms the cache back up. Motivation has a habit of showing up after you begin. And on the days it never shows, one sentence is still one more than zero, and the streak survives the night.

## stop invalidating on every write

Some of us clear our own cache all day long. We check how we feel about the goal every hour, measure our progress against a stranger's best moments, and rewrite the whole plan after one bad day. Every one of those is an invalidation, and each forces a slow, expensive recompute of the same old question: is this even worth it?

Answer that question once, on a calm day, and write the answer down. Then stop asking it every morning. Review it on a schedule (once a month is plenty), not every time a mood passes through.

> You don't need to believe in the plan every morning. You only need to have believed in it once, carefully, and written it down.

## log the misses, skip the verdict

Good systems keep logs, and the useful ones are boring. They record what happened, not who to blame.

When you skip a day, write one line: what you planned, what happened instead, and what got in the way. No "I'm so lazy", no essay. After a few weeks the patterns surface on their own. Maybe Mondays always collapse because of a standing call. Maybe evenings never work for you. That says something about your week, not your worth, and a week is something you can redesign.

## warm the cache on purpose

Caches can be warmed, and so can motivation. You warm it by feeding it the things that usually refill it, instead of waiting for it to come back on its own:

- Finish something small before you start something big.
- Look back at the record of days you showed up.
- Talk about the work with one person who cares about it.
- Reread why you started, in your own words from that calm day.

Your list will look different, and it should. What matters is that it exists, so on an empty Tuesday you have somewhere to look besides your mood.

## what a bad day looks like now

You wake up with nothing. The cache is cold. You don't argue with the feeling; you route around it.

1. Go to the fixed place at the fixed time.
2. Do the smallest version of the task.
3. Mark the day in the record.
4. If the cache warms up, keep going. If it doesn't, stop without guilt.

That's the whole system. It won't inspire anyone, and it doesn't have to, because it keeps running on the days inspiration doesn't.

Motivation is still welcome here. Enjoy the days it shows up and ride them as far as they go. Just don't build your life on top of something with a short time to live.
