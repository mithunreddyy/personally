import { BlogPost } from "../types";
import { Arrow, Row, Section, TextLink } from "./List";

/** One line per post: title on the left, read time on the right */
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
  return (
    <Section id="blog" title={title} delay={delay}>
      {blogs.length === 0 ? (
        <p className="text-muted">No posts yet. New writing will show up here.</p>
      ) : (
        <ol className="focus-index flex flex-col gap-1.5 max-[359.98px]:gap-2.5">
          {blogs.map(post => (
            <li key={post.id} className="focus-item">
              <Row
                name={
                  <span className="focus-title">
                    <TextLink to={`/blog/${post.slug}`}>{post.title.replace(/\n/g, " ")}</TextLink>
                  </span>
                }
                detail={post.readTime}
              />
            </li>
          ))}
        </ol>
      )}
      {showFeed && blogs.length > 0 && (
        <p className="text-muted">
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
