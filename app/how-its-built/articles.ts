import { readFileSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";

// Lessons Learned (MVP1-E0-47): articles Nikhil has published elsewhere, grouped by domain and shown
// verbatim from one Markdown file each in content/articles/. The text is his; never edit it here.

export type Article = {
  slug: string;
  title: string;
  domain: string;
  source: string;
  published: string;
  // The original post. Null until Nikhil gives the address; the page then shows no link.
  originalUrl: string | null;
  file: string;
};

export const articles: Article[] = [
  {
    slug: "beyond-the-happy-path",
    title: "Beyond the Happy Path",
    domain: "Payments",
    source: "LinkedIn",
    published: "3 Nov 2026",
    originalUrl: null,
    file: "content/articles/beyond-the-happy-path.md",
  },
];

// Domains in the order they appear on the tab, each with its articles.
export const articleDomains = [...new Set(articles.map((item) => item.domain))].map((domain) => ({
  domain,
  items: articles.filter((item) => item.domain === domain),
}));

export const findArticle = (slug: string) => articles.find((item) => item.slug === slug);

// The article as HTML, read and rendered at build time. Null while the file is empty, so the page
// shows "Coming Soon..." instead of inventing text. The file is in the repository, so it is trusted.
export function articleHtml(article: Article): string | null {
  const markdown = readFileSync(path.join(process.cwd(), article.file), "utf8");
  return markdown.trim() ? (marked.parse(markdown, { async: false }) as string) : null;
}
