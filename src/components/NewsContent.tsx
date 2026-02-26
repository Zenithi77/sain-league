"use client";

import { useEffect, useRef, useMemo } from "react";

export interface TocItem {
  id: string;
  text: string;
  level: "h1" | "h2" | "h3";
}

interface NewsContentProps {
  content: string;
  articleId: string;
  onTocReady?: (items: TocItem[]) => void;
}

// Add IDs to headings and extract TOC items
function processHeadings(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const headingRegex = /<(h[1-3])([^>]*)>([\s\S]*?)<\/\1>/gi;
  let counter = 0;

  const processed = html.replace(headingRegex, (match, tag, attrs, inner) => {
    const text = inner.replace(/<[^>]*>/g, "").trim();
    const id = `heading-${counter++}`;
    const level = tag.toLowerCase() as "h1" | "h2" | "h3";
    toc.push({ id, text, level });

    // If there's already an id attribute, replace it; otherwise add one
    if (/id="[^"]*"/.test(attrs)) {
      attrs = attrs.replace(/id="[^"]*"/, `id="${id}"`);
    } else {
      attrs += ` id="${id}"`;
    }

    return `<${tag}${attrs}>${inner}</${tag}>`;
  });

  return { html: processed, toc };
}

// Convert oembed tags to proper video embeds
function processMediaEmbeds(html: string): string {
  const oembedRegex =
    /<figure class="media">\s*<oembed url="([^"]+)">\s*<\/oembed>\s*<\/figure>/gi;

  return html.replace(oembedRegex, (match, url) => {
    // Handle YouTube URLs
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    );
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return `
        <figure class="media">
          <div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 12px; margin: 24px 0;">
            <iframe 
              src="https://www.youtube.com/embed/${videoId}" 
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 12px;"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
            ></iframe>
          </div>
        </figure>
      `;
    }

    // Handle Vimeo URLs
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      return `
        <figure class="media">
          <div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 12px; margin: 24px 0;">
            <iframe 
              src="https://player.vimeo.com/video/${videoId}" 
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 12px;"
              allow="autoplay; fullscreen; picture-in-picture" 
              allowfullscreen
            ></iframe>
          </div>
        </figure>
      `;
    }

    return match;
  });
}

export default function NewsContent({
  content,
  articleId,
  onTocReady,
}: NewsContentProps) {
  const hasTrackedView = useRef(false);
  const hasSentToc = useRef(false);

  const { html: processedContent, toc } = useMemo(() => {
    const withEmbeds = processMediaEmbeds(content);
    return processHeadings(withEmbeds);
  }, [content]);

  useEffect(() => {
    if (onTocReady && toc.length > 0 && !hasSentToc.current) {
      hasSentToc.current = true;
      onTocReady(toc);
    }
  }, [toc, onTocReady]);

  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
    }
  }, [articleId]);

  return (
    <div
      className="news-detail-prose"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
