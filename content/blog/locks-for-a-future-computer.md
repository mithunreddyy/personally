---
title: "locks for a future computer"
date: 2026-11-08
category: "Tech"
excerpt: "No computer can break today's web encryption yet. Someone could still save your traffic now and open it later. That's why most browser connections quietly switched to post-quantum locks this year."
published: true
---

Imagine someone photocopies every sealed letter you send and files them in a warehouse. They can't open the envelopes. They don't need to yet. They're betting that one day they'll have a machine that can, and then the whole warehouse opens at once.

That bet has a name, harvest now, decrypt later, and it's why the web's encryption has been changing under your feet. If you opened a website this week, the odds are good that it used a lock designed for a computer that hasn't been built.

## the lock we've been using

Every HTTPS connection starts with a key exchange. Your browser and the server agree on a secret key over an open network, in a way that someone listening can't work out. For years that has been done with elliptic-curve maths, most often a method called X25519.

It's safe against every computer that exists. The worry is a large, reliable quantum computer. In 1994 Peter Shor showed that such a machine could solve the maths behind both elliptic-curve and RSA cryptography quickly. Nobody has built a quantum computer big enough to do it, and estimates of when anyone will vary widely. But encrypted traffic recorded today will still be sitting in that warehouse whenever the machine shows up.

## the new lock

In August 2024 the US National Institute of Standards and Technology (NIST) published its first three post-quantum standards:

- **FIPS 203, ML-KEM**, for agreeing on keys. This is the one that protects your browsing.
- **FIPS 204, ML-DSA**, for digital signatures, formerly known as CRYSTALS-Dilithium.
- **FIPS 205, SLH-DSA**, also for signatures, formerly SPHINCS+.

ML-KEM is built on lattice problems, a kind of maths for which nobody knows a fast attack, on ordinary or quantum computers.

## belt and braces

New cryptography makes careful people nervous, and fairly so: it hasn't had decades of attack. So browsers didn't switch from X25519 to ML-KEM. They use both at once, in a hybrid called `X25519MLKEM768`. The final key mixes a secret from each method, so an attacker has to break both. If a flaw turns up in the new maths, you still have the old lock. If a quantum computer arrives, you still have the new one.

The price is size. An X25519 public key is 32 bytes, and an ML-KEM-768 public key is 1,184 bytes. That adds about a kilobyte to the first message of a connection, which you won't notice, although some old network equipment that expected small handshakes did.

## how far it has got

Chrome, Firefox, Edge and Safari all offer the hybrid now. In September 2026, Cloudflare reported that about 70% of the browser traffic reaching its network was protected with hybrid ML-KEM, but only about 15% of the origin servers Cloudflare connects to behind that supported it.

That gap is the interesting part. Browsers update themselves every few weeks, while servers are configured once and forgotten. The quantum-safe part of the internet is now mostly the stretch between you and the nearest big network, and the rest is catching up slowly.

You can check any site yourself. In Chrome, open DevTools, go to the Security panel and look at the connection. If the key exchange says `X25519MLKEM768`, that connection is using the new lock.

## what's still to do

Key exchange went first because it's the part the warehouse threatens. A recorded session can be decrypted later, but a forged signature is only useful while the conversation is happening. Signatures, the certificates that prove a site is who it says it is, are a harder change: the post-quantum versions are much larger, and they touch every certificate authority on earth. That work is under way and will take years.

NIST's draft transition plan proposes deprecating today's RSA and elliptic-curve methods by 2030 and disallowing them by 2035. If you run servers, the job for now is short: make sure your TLS library and load balancer offer the hybrid key exchange, then check that they do.

The envelopes being filed today are already getting harder to open. The remaining work is on the servers behind them.

## sources

- [NIST releases first 3 finalized post-quantum encryption standards](https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards), NIST, August 2024
- [Is your domain using post-quantum encryption?](https://blog.cloudflare.com/post-quantum-visibility/), Cloudflare, 29 September 2026
- [Post-quantum encryption adoption](https://radar.cloudflare.com/post-quantum), Cloudflare Radar
