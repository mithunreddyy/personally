import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { BLOG_POSTS } from "../constants";
import { formatPostDate } from "../lib/utils";
import { Article, ArticleSection } from "./Article";
import { Blog } from "./Blog";
import { NotFound } from "./NotFound";
import { SEO } from "./SEO";

/* Content parser */

type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; segments: TextSegment[] }
  | { type: "list"; style: "bullet" | "number"; items: ListItem[] };

type TextSegment = { text: string; bold: boolean };

interface ListItem {
  segments: TextSegment[];
  children?: ListItem[];
}

/** Parse **bold** markers inside a text string */
const parseInline = (raw: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex), bold: false });
  }

  return segments.length ? segments : [{ text: raw, bold: false }];
};

const parseContent = (content: string): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  let currentBlock: ContentBlock | null = null;
  let pendingNumberedItem: ListItem | null = null;

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
    const line = rawLine.trim();

    if (!line) {
      // Don't flush numbered list blocks on empty lines, they may have sub-bullets
      if (currentBlock?.type !== "list" || currentBlock.style !== "number") {
        flush();
      } else {
        flushPending();
      }
      continue;
    }

    const headingMatch = line.match(/^(.+?):$/);
    const bulletMatch = line.match(/^[•*-]\s+(.*)$/);
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);

    if (headingMatch && line.endsWith(":")) {
      flush();
      currentBlock = { type: "heading", text: headingMatch[1] };
      flush();
      continue;
    }

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
      // Sub-bullet of a numbered list item
      if (pendingNumberedItem) {
        if (!pendingNumberedItem.children) pendingNumberedItem.children = [];
        pendingNumberedItem.children.push({ segments: parseInline(bulletMatch[1]) });
        continue;
      }

      // Standalone bullet list
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

    // Regular paragraph text
    if (currentBlock?.type === "paragraph") {
      const existing = currentBlock.segments.map(s => s.text).join("");
      currentBlock.segments = parseInline(existing + " " + line);
    } else {
      flush();
      currentBlock = { type: "paragraph", segments: parseInline(line) };
    }
  }

  flushPending();
  flush();
  return blocks;
};

/* Inline text renderer */

function RichText({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.bold ? (
          <strong key={i} className="font-medium text-ink">
            {seg.text}
          </strong>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
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
  // Oldest post is 001, so a number never changes once published
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
            "@id": `https://mithunreddyy.github.io/Portfolio/blog/${post.slug}`,
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
            <button type="button" onClick={copyLink} className="link-line">
              {linkCopied ? "Link copied" : "Copy link"}
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
