import { BlogPost } from "../types";
import { Section, TextLink } from "./List";

/** Ledger of posts: the year hangs in the left column once, beside the first post written that year */
export function Blog({
  blogs,
  title = "Writing",
  delay = 0,
  showFeed = false,
}: {
  blogs: BlogPost[];
  title?: string;
  delay?: number;
  showFeed?: boolean;
}) {
  return (
    <Section id="blog" title={title} delay={delay}>
      {blogs.length === 0 ? (
        <p className="text-muted">No posts yet. New writing will show up here.</p>
      ) : (
        <ol className="focus-index flex flex-col gap-4">
          {blogs.map((post, i) => {
            const year = post.date.slice(0, 4);
            const firstOfYear = i === 0 || blogs[i - 1].date.slice(0, 4) !== year;
            return (
              <li key={post.id} className="focus-item grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-1">
                <span className="text-muted tabular-nums">
                  {firstOfYear && <time dateTime={year}>{year}</time>}
                </span>
                <div className="flex flex-col">
                  <span className="focus-title">
                    <TextLink to={`/blog/${post.slug}`}>{post.title.replace(/\n/g, " ")}</TextLink>
                  </span>
                  <span className="text-muted text-[15px] leading-[22px] mt-1">
                    {[post.category, post.readTime].filter(Boolean).join(", ")}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {showFeed && blogs.length > 0 && (
        <p className="text-muted">
          New posts also go out through the{" "}
          <a href={`${import.meta.env.BASE_URL}feed.xml`} className="link-line">
            RSS feed
          </a>
          .
        </p>
      )}
    </Section>
  );
}
