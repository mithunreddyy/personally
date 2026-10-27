import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { BLOG_POSTS } from "../constants";
import { formatPostDate } from "../lib/utils";
import { Article, ArticleSection } from "./Article";
import { Blog } from "./Blog";
import { NotFound } from "./NotFound";
import { SEO } from "./SEO";

/* Content parser */

export type InlineSegment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; url: string };

export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; segments: InlineSegment[] }
  | { type: "list"; style: "bullet" | "number"; items: ListItem[] }
  | { type: "codeblock"; language?: string; code: string }
  | { type: "blockquote"; segments: InlineSegment[] };

export interface ListItem {
  segments: InlineSegment[];
  children?: ListItem[];
}

/** Parses **bold**, `code`, and [text](url) markers inside inline prose */
export const parseInline = (raw: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  const tokenRegex = /(\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: raw.slice(lastIndex, match.index) });
    }

    if (match[2] !== undefined) {
      segments.push({ type: "bold", text: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: "code", text: match[3] });
    } else if (match[4] !== undefined && match[5] !== undefined) {
      segments.push({ type: "link", text: match[4], url: match[5] });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: "text", text: raw.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", text: raw }];
};

const parseContent = (content: string): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  let currentBlock: ContentBlock | null = null;
  let pendingNumberedItem: ListItem | null = null;
  let inCodeBlock: { language: string; lines: string[] } | null = null;

  const flush = () => {
    if (pendingNumberedItem && currentBlock?.type === "list" && currentBlock.style === "number") {
      currentBlock.items.push(pendingNumberedItem);
      pendingNumberedItem = null;
    }
    if (currentBlock) {
      blocks.push(currentBlock);
      currentBlock = null;
    }
  };

  const flushPending = () => {
    if (pendingNumberedItem && currentBlock?.type === "list" && currentBlock.style === "number") {
      currentBlock.items.push(pendingNumberedItem);
      pendingNumberedItem = null;
    }
  };

  const lines = content.split("\n");

  for (const rawLine of lines) {
    if (inCodeBlock) {
      if (rawLine.trim().startsWith("```")) {
        blocks.push({
          type: "codeblock",
          language: inCodeBlock.language,
          code: inCodeBlock.lines.join("\n"),
        });
        inCodeBlock = null;
      } else {
        inCodeBlock.lines.push(rawLine);
      }
      continue;
    }

    const line = rawLine.trim();

    if (line.startsWith("```")) {
      flush();
      const language = line.slice(3).trim();
      inCodeBlock = { language, lines: [] };
      continue;
    }

    if (!line) {
      if (currentBlock?.type !== "list" || currentBlock.style !== "number") {
        flush();
      } else {
        flushPending();
      }
      continue;
    }

    if (line.startsWith("> ") || line === ">") {
      flush();
      blocks.push({
        type: "blockquote",
        segments: parseInline(line.replace(/^>\s?/, "")),
      });
      continue;
    }

    const mdHeadingMatch = line.match(/^#{1,4}\s+(.+)$/);
    const colonHeadingMatch = line.length <= 40 && !line.includes("(") && !line.includes("`") && line.endsWith(":") && line.slice(0, -1).trim();

    if (mdHeadingMatch || colonHeadingMatch) {
      flush();
      const headingText = mdHeadingMatch ? mdHeadingMatch[1].trim() : (colonHeadingMatch as string);
      currentBlock = { type: "heading", text: headingText };
      flush();
      continue;
    }

    const bulletMatch = line.match(/^[•*-]\s+(.*)$/);
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);

    if (orderedMatch) {
      if (currentBlock?.type !== "list" || currentBlock.style !== "number") {
        flush();
        currentBlock = { type: "list", style: "number", items: [] };
      } else {
        flushPending();
      }
      pendingNumberedItem = { segments: parseInline(orderedMatch[2]), children: [] };
      continue;
    }

    if (bulletMatch) {
      if (pendingNumberedItem) {
        if (!pendingNumberedItem.children) pendingNumberedItem.children = [];
        pendingNumberedItem.children.push({ segments: parseInline(bulletMatch[1]) });
        continue;
      }

      if (currentBlock?.type === "list" && currentBlock.style === "bullet") {
        currentBlock.items.push({ segments: parseInline(bulletMatch[1]) });
      } else {
        flush();
        currentBlock = {
          type: "list",
          style: "bullet",
          items: [{ segments: parseInline(bulletMatch[1]) }],
        };
      }
      continue;
    }

    if (currentBlock?.type === "paragraph") {
      currentBlock.segments.push({ type: "text", text: " " }, ...parseInline(line));
    } else {
      flush();
      currentBlock = { type: "paragraph", segments: parseInline(line) };
    }
  }

  if (inCodeBlock) {
    blocks.push({
      type: "codeblock",
      language: inCodeBlock.language,
      code: inCodeBlock.lines.join("\n"),
    });
  }

  flushPending();
  flush();
  return blocks;
};

/* Inline text renderer */

function RichText({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "bold") {
          return (
            <strong key={i} className="font-medium text-ink">
              {seg.text}
            </strong>
          );
        }
        if (seg.type === "code") {
          return (
            <code key={i} className="px-1.5 py-0.5 rounded font-mono text-[13.5px] bg-ink/[0.06] text-ink">
              {seg.text}
            </code>
          );
        }
        if (seg.type === "link") {
          const isExternal = seg.url.startsWith("http://") || seg.url.startsWith("https://");
          return (
            <a
              key={i}
              href={seg.url}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer" : undefined}
              className="link-line text-ink hover:text-accent transition-colors"
            >
              {seg.text}
            </a>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard fallback
    }
  };

  return (
    <div className="my-5 w-full max-w-full min-w-0 rounded-lg border border-line bg-ink/[0.03] overflow-hidden text-[13.5px] leading-[22px] font-mono">
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-line text-xs text-muted select-none">
        <span className="font-mono text-muted/80">{language || "code"}</span>
        <button
          type="button"
          onClick={copy}
          className="hover:text-ink transition-colors flex items-center gap-1.5 font-sans text-xs py-0.5 px-1 -my-0.5 rounded"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-accent" aria-hidden="true" />
              <span className="text-accent">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre
        tabIndex={0}
        aria-label={`${language || "code"} snippet`}
        className="p-4 w-full max-w-full min-w-0 overflow-x-auto overflow-y-auto max-h-[380px] text-ink selection:bg-accent/30 font-mono whitespace-pre focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 overscroll-contain"
      >
        <code className="block min-w-max font-mono text-inherit pr-4">{code}</code>
      </pre>
    </div>
  );
}

function Block({ block }: { block: ContentBlock }) {
  if (block.type === "paragraph") {
    return (
      <p className="text-pretty">
        <RichText segments={block.segments} />
      </p>
    );
  }
  if (block.type === "codeblock") {
    return <CodeBlock language={block.language} code={block.code} />;
  }
  if (block.type === "blockquote") {
    return (
      <blockquote className="my-4 pl-4 border-l-2 border-line text-muted italic">
        <RichText segments={block.segments} />
      </blockquote>
    );
  }
  if (block.type !== "list") return null;

  const List = block.style === "number" ? "ol" : "ul";
  return (
    <List className={`flex flex-col gap-2 pl-5 marker:text-muted ${block.style === "number" ? "list-decimal" : "list-disc"}`}>
      {block.items.map((item, i) => (
        <li key={i} className="pl-1">
          <RichText segments={item.segments} />
          {item.children && item.children.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5 pl-5 list-disc marker:text-muted">
              {item.children.map((child, ci) => (
                <li key={ci} className="pl-1">
                  <RichText segments={child.segments} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </List>
  );
}

/** Splits the flat block list into runs that each start at a heading */
function groupByHeading(blocks: ContentBlock[]) {
  const groups: { id?: string; title?: string; blocks: ContentBlock[] }[] = [{ blocks: [] }];
  blocks.forEach((block, index) => {
    if (block.type === "heading") groups.push({ id: `section-${index}`, title: block.text, blocks: [] });
    else groups[groups.length - 1].blocks.push(block);
  });
  return groups.filter(g => g.title || g.blocks.length);
}

/* Main component */

export function BlogPostView() {
  const { slug } = useParams();
  const position = BLOG_POSTS.findIndex(b => b.slug === slug);
  const post = position >= 0 ? BLOG_POSTS[position] : null;
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!linkCopied) return;
    const timer = setTimeout(() => setLinkCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [linkCopied]);

  if (!post) return <NotFound />;

  const groups = groupByHeading(post.content ? parseContent(post.content) : []);
  const toc = groups.flatMap(g => (g.id && g.title ? [{ id: g.id, label: g.title }] : []));
  const issue = String(BLOG_POSTS.length - position).padStart(3, "0");
  const otherPosts = BLOG_POSTS.filter(b => b.slug !== slug);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
    } catch {
      // Clipboard blocked: leave the label unchanged rather than claim a copy
    }
  };

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        type="article"
        schema={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          author: { "@type": "Person", name: "Mithun Reddy" },
          datePublished: post.date,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `https://mithunre.vercel.app/blog/${post.slug}`,
          },
        }}
      />

      <Article
        index={issue}
        title={post.title.replace(/\n/g, " ")}
        toc={toc}
        meta={
          <>
            Published <time dateTime={post.date}>{formatPostDate(post.date, "long")}</time>, {post.readTime}.{" "}
            <button type="button" onClick={copyLink} className="link-line text-[15px] leading-[22px]">
              {linkCopied ? "Link copied" : "copy link"}
            </button>
            <span role="status" className="sr-only">
              {linkCopied ? "Link copied to clipboard" : ""}
            </span>
          </>
        }
      >
        {post.excerpt && (
          <ArticleSection>
            <p className="text-ink text-pretty">
              <RichText segments={parseInline(post.excerpt)} />
            </p>
          </ArticleSection>
        )}

        {groups.length ? (
          groups.map((group, i) => (
            <ArticleSection key={group.id ?? i} id={group.id} title={group.title}>
              {group.blocks.map((block, bi) => (
                <Block key={bi} block={block} />
              ))}
            </ArticleSection>
          ))
        ) : (
          <ArticleSection>
            <p className="text-muted">This post has no body yet.</p>
          </ArticleSection>
        )}
      </Article>

      {otherPosts.length > 0 && <Blog blogs={otherPosts} title="More writing" delay={120} />}
    </>
  );
}
