---
title: "the protocol that forgets"
date: 2026-11-24
category: "AI"
excerpt: "The Model Context Protocol, the way AI apps plug into tools, just stopped remembering who it's talking to. That sounds like a downgrade. It's the change that lets it run at scale."
published: true
---

Picture two cloakrooms. In the first, an attendant takes your coat and remembers your face. When you come back, you need that exact person, on that exact shift, with their memory intact. In the second, you get a numbered ticket. Any attendant can read it, at any counter, at any hour.

The first cloakroom feels friendlier. The second keeps working when it gets busy.

The Model Context Protocol (MCP) just moved from the first cloakroom to the second. If you build anything that lets an AI model use tools, this is the change of the year to understand.

## what mcp is, in one paragraph

Anthropic introduced MCP in November 2024 as an open standard for connecting AI applications to the things they need: files, databases, issue trackers, calendars. It has three roles. The **host** is the app you talk to, like a chat app or a code editor. Inside it, a **client** keeps one connection to each **server**, and a server is a small program that offers **tools** (actions the model can call), **resources** (data it can read) and **prompts** (templates it can fill in). Write a server once and any host that speaks MCP can use it. In December 2025 Anthropic gave the protocol to the Agentic AI Foundation, a fund under the Linux Foundation that Anthropic, Block and OpenAI co-founded.

## the old way: a phone call

Until this summer, an MCP connection worked like a phone call. The client and server opened with a handshake (`initialize`, then `initialized`), agreed on what each could do, and got a session ID. Every later message leaned on that shared memory.

Phone calls are fine on one laptop. They get awkward in a data centre. If you run ten copies of a server behind a load balancer, the request that arrives at copy number seven has to find the session that copy number two remembers. So you add sticky routing, or a shared store for sessions, or both. Something that should have been a simple web service now carries state you have to babysit.

## the new way: a letter

The spec released on 28 July 2026 turns MCP into request and response. The handshake and the `Mcp-Session-Id` header are gone. Every request now carries what the server needs to know about the caller, including its protocol version, who it is and what it can do, in a `_meta` field. A client that wants to know a server's abilities up front can ask with a new optional `server/discover` call.

The spec's own summary of the result: any request can now land on any server instance behind a plain round-robin load balancer, without shared storage.

Each request is a letter that makes sense on its own, so any copy of the server can answer it.

## but what about state?

Some tools really do need memory, like a shopping cart or a long-running export. The spec's answer is the cloakroom ticket. The server hands back an explicit handle from a tool call, and the model passes that handle back as an argument next time.

```json
{ "tool": "add_to_cart", "arguments": { "cart": "c_8f2a", "item": "kettle" } }
```

The state still exists. It just lives somewhere you can see it, not inside a connection nobody can inspect.

## questions without a held line

The old protocol let a server call the client back mid-request, for instance to ask the user a question. That needed a stream held open the whole time. The new spec replaces it with multi round-trip requests: the server replies with `resultType: "input_required"`, and the client sends the call again with the answers in `inputResponses`. It's slower by one round trip and far easier to run.

## smaller changes that add up

- Streamable HTTP requests carry `Mcp-Method` and `Mcp-Name` headers, so a gateway can route a call without opening its body.
- Lists of tools, prompts and resources come with `ttlMs` and `cacheScope`, so a client knows how long it may cache them.
- Tasks moved out of the core and into an extension, alongside MCP Apps and enterprise-managed authorisation. The core gets smaller and the extras become optional.
- Clients must check the `iss` value an authorisation server returns before redeeming a code, and dynamic client registration is deprecated in favour of client ID metadata documents.
- A formal deprecation policy promises at least twelve months' notice. Roots, sampling and logging are deprecated under it, and so is the older HTTP+SSE transport.

The TypeScript, Python, Go and C# SDKs already speak the new version, and the Rust SDK is in beta.

## why forgetting is the feature

Statelessness is what made the web easy to scale. A web server doesn't remember you between page loads. Cookies and tokens carry who you are, and any machine in the fleet can answer. MCP is borrowing that lesson. Servers become ordinary web services you can deploy, cache, route and restart like everything else you run.

The attendant who remembers your face was a nice touch. The ticket gets your coat back when the room is full.

## sources

- [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol), Anthropic, November 2024
- [Donating MCP and establishing the Agentic AI Foundation](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation), Anthropic, 9 December 2025
- [The 2026-07-28 specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/), MCP blog, 28 July 2026
