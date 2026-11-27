import { CSSProperties, useEffect, useState } from "react";

import { FINISHED, readProgress, STARTED, timeLeft } from "../lib/readingProgress";
import { BlogPost } from "../types";
import { Arrow, Row, Section, TextLink } from "./List";

/** One line per post: title on the left, read time on the right. A post this browser has started shows the
    time left instead, and its underline is drawn in muted as far as the reader got */
export function Blog({
  blogs,
  title = "writing",
  delay = 0,
  showFeed = false,
}: {
  blogs: BlogPost[];
  title?: string;
  delay?: number;
  showFeed?: boolean;
}) {
  // Read after mount, so the prerendered page (which knows no reader) matches the first render
  const [reading, setReading] = useState<Record<string, number>>({});
  useEffect(() => {
    const found: Record<string, number> = {};
    blogs.forEach(post => {
      const progress = readProgress(post.slug);
      if (progress !== null && progress >= STARTED) found[post.slug] = progress;
    });
    setReading(found);
  }, [blogs]);

  return (
    <Section id="blog" title={title} delay={delay}>
      {blogs.length === 0 ? (
        <p className="text-muted">No posts yet. New writing will show up here.</p>
      ) : (
        <ol className="focus-index flex flex-col gap-1.5 max-[359.98px]:gap-2.5">
          {blogs.map(post => {
            const progress = reading[post.slug];
            const finished = progress !== undefined && progress >= FINISHED;
            return (
              <li key={post.id} className="focus-item">
                <Row
                  name={
                    <span
                      className={`focus-title${progress !== undefined ? " has-read" : ""}`}
                      style={progress !== undefined ? ({ "--read": finished ? 1 : progress } as CSSProperties) : undefined}
                    >
                      <TextLink to={`/blog/${post.slug}`} travel>
                        {post.title.replace(/\n/g, " ")}
                      </TextLink>
                    </span>
                  }
                  detail={progress === undefined ? post.readTime : finished ? "finished" : timeLeft(post.readTime, progress)}
                />
              </li>
            );
          })}
        </ol>
      )}
      {showFeed && blogs.length > 0 && (
        <p className="text-body">
          New posts also go out through the{" "}
          <a href={`${import.meta.env.BASE_URL}feed.xml`} className="group">
            <span className="link-line">RSS feed</span>
            <Arrow />
          </a>
          .
        </p>
      )}
    </Section>
  );
}
