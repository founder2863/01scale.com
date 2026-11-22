import { readFileSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";

// Published articles on the Expensive Mistakes tab (MVP1-E0-47), one heading per domain, shown
// verbatim from one Markdown file each in content/articles/. The text is his; never edit it here.

export type Article = {
  slug: string;
  title: string;
  domain: string;
  source: string;
  published: string;
  // The original post. Null when there is no address yet; the page then shows no link.
  originalUrl: string | null;
  file: string;
};

export const articles: Article[] = [
  {
    slug: "beyond-the-happy-path",
    title: "Beyond the Happy Path: 10 Lessons from Building Embedded Payments in Vertical SaaS",
    domain: "Payments",
    source: "LinkedIn",
    published: "3 Nov 2026",
    originalUrl: "https://www.linkedin.com/pulse/beyond-happy-path-10-lessons-from-building-embedded-saas-shrivastava-3f79c/",
    file: "content/articles/beyond-the-happy-path.md",
  },
];

// Domains in the order they appear on the tab, each with its articles.
export const articleDomains = [...new Set(articles.map((item) => item.domain))].map((domain) => ({
  domain,
  items: articles.filter((item) => item.domain === domain),
}));

export const findArticle = (slug: string) => articles.find((item) => item.slug === slug);

// The article as HTML, read and rendered at build time, split at each "##" heading so every section
// can be collapsed. The text before the first heading is the introduction and always shows. Null while
// the file is empty, so the page shows "Coming Soon..." instead of inventing text. The file is in the
// repository, so it is trusted.
export type ArticleBody = { intro: string; sections: { heading: string; html: string }[] };

export function articleBody(article: Article): ArticleBody | null {
  const markdown = readFileSync(path.join(process.cwd(), article.file), "utf8");
  if (!markdown.trim()) return null;
  const render = (text: string) => marked.parse(text, { async: false }) as string;
  const [intro, ...rest] = markdown.split(/^## /m);
  return {
    intro: render(intro),
    sections: rest.map((chunk) => {
      const newline = chunk.indexOf("\n");
      const title = newline === -1 ? chunk : chunk.slice(0, newline);
      const body = newline === -1 ? "" : chunk.slice(newline + 1);
      return { heading: marked.parseInline(title.trim(), { async: false }) as string, html: render(body) };
    }),
  };
}
