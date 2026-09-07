# Portfolio Modifications & Customization Guide

This document records all modifications requested and implemented for the portfolio website ([aggrawal-ankur.github.io](https://aggrawal-ankur.github.io/)), along with instructions for how to verify and use each feature.

---

## #1 CSS Rendering in `site-credits` Page
**Status:** ✅ **Solved**

- **What was changed:** Copied markdown table and blockquote styling from `BlogPost.astro` into `src/pages/site-credits.astro`.
- **Files Modified:** [`src/pages/site-credits.astro`](file:///home/ayush/ankurPortfolio/src/pages/site-credits.astro)
- **How to verify:**
  - Visit [`http://localhost:4321/site-credits/`](http://localhost:4321/site-credits/) (or click **Site Credits** in the top navigation).
  - The table has clean borders, padding, and header highlights.
  - The blockquotes render with the theme accent vertical bar on the left.
- **How to use:**
  - Write standard markdown tables (`| col1 | col2 |`) and blockquotes (`> quote text`) inside [`src/content/page/site-credits.md`](file:///home/ayush/ankurPortfolio/src/content/page/site-credits.md). They will automatically be styled properly.

---

## #2 Support For Draft Pages
**Status:** ✅ **Solved**

- **What was changed:** 
  - Updated content schema in `src/content.config.ts` to accept boolean (`true`/`false`) and string (`"true"`/`"false"`), defaulting to `false` when omitted.
  - Configured `getAllPosts()` in `src/data/post.ts` to filter out all posts with `draft: true` when building for production (`npm run build`).
  - Added visual `(Draft)` flag in `BlogPost.astro` during local development (`npm run dev`).
- **Files Modified:** [`src/content.config.ts`](file:///home/ayush/ankurPortfolio/src/content.config.ts), [`src/data/post.ts`](file:///home/ayush/ankurPortfolio/src/data/post.ts), [`src/layouts/BlogPost.astro`](file:///home/ayush/ankurPortfolio/src/layouts/BlogPost.astro)
- **How to verify:**
  - **Local Dev (`npm run dev`):** Draft posts appear in `/posts/` with an orange `(Draft)` badge so you can preview your writing.
  - **Production Build (`npm run build`):** Draft posts are completely excluded from the generated `dist/` site, RSS feed, sitemap, tags, and search index.
- **How to use:**
  - In any post frontmatter under `src/content/post/`:
    ```yaml
    ---
    title: "My In-Progress Article"
    publishDate: 2026-09-07
    description: "Summary for preview."
    tags: [ systems, c ]
    draft: true   # Set to true to keep it unpublished. Change to false (or delete line) when ready to publish.
    ---
    ```

---

## #3 Adequate Word & Letter Spacing for Readability
**Status:** ✅ **Solved**

- **What was changed:**
  - Removed negative letter tracking (`letter-spacing: -0.022em`, `-0.02em`, etc.) from headings, post titles, timeline items, and navigation.
  - Added `word-spacing: 0.04em` to body prose so words have natural, comfortable breathing room.
  - Fixed navbar text wrapping (`white-space: nowrap`) and spacing between nav items.
- **Files Modified:** [`src/styles/global.css`](file:///home/ayush/ankurPortfolio/src/styles/global.css), [`src/layouts/Base.astro`](file:///home/ayush/ankurPortfolio/src/layouts/Base.astro), [`src/layouts/BlogPost.astro`](file:///home/ayush/ankurPortfolio/src/layouts/BlogPost.astro), [`src/pages/index.astro`](file:///home/ayush/ankurPortfolio/src/pages/index.astro), [`src/components/layout/Header.astro`](file:///home/ayush/ankurPortfolio/src/components/layout/Header.astro)
- **How to verify:**
  - Open any article (e.g. [`http://localhost:4321/posts/`](http://localhost:4321/posts/)) or page.
  - Text reads comfortably without letters or words feeling cramped or overlapping.

---

## #4 Disable Drop Cap (Large Initial Letter in Posts)
**Status:** ✅ **Solved**

- **What was changed:** Removed `.post-article > p:first-of-type::first-letter` drop cap rule from `src/layouts/BlogPost.astro`.
- **Files Modified:** [`src/layouts/BlogPost.astro`](file:///home/ayush/ankurPortfolio/src/layouts/BlogPost.astro)
- **How to verify:**
  - Open any blog post.
  - The first letter of the first paragraph is regular size and aligns naturally with the rest of the text.

---

## #5 Timeline & Duration in Showcase Projects
**Status:** ✅ **Solved**

- **What was changed:**
  - Extended `ShowcaseItem` interface with optional `startDate` and `endDate` fields.
  - Added `formatShowcaseTimeline(startDate, endDate)` helper to automatically format dates and compute inclusive calendar day duration (e.g. `August 10, 2026 - September 05, 2026 (27 days)`).
  - Rendered timeline range line in `src/pages/showcase.astro` with monospace tabular number styling.
- **Files Modified:** [`src/data/showcase.ts`](file:///home/ayush/ankurPortfolio/src/data/showcase.ts), [`src/pages/showcase.astro`](file:///home/ayush/ankurPortfolio/src/pages/showcase.astro), [`src/styles/global.css`](file:///home/ayush/ankurPortfolio/src/styles/global.css)
- **How to verify:**
  - Visit [`http://localhost:4321/showcase/`](http://localhost:4321/showcase/).
  - Projects with dates display their timeline and calculated day count.
- **How to use:**
  - In `src/data/showcase.ts`, add `startDate` and `endDate` in `YYYY-MM-DD` format:
    ```typescript
    {
      name: "my-project",
      href: "https://github.com/aggrawal-ankur/my-project",
      stack: "C · Linux",
      startDate: "2026-08-10",
      endDate: "2026-09-05",
      badge: "DONE",
      desc: "Project description..."
    }
    ```

---

## #6 Remove Default Italics from Blockquotes
**Status:** ✅ **Solved**

- **What was changed:** Removed `font-style: italic;` from the `.post-article blockquote` CSS rule in `BlogPost.astro`.
- **Files Modified:** [`src/layouts/BlogPost.astro`](file:///home/ayush/ankurPortfolio/src/layouts/BlogPost.astro)
- **How to verify:**
  - Open any post with a blockquote.
  - Text inside `>` is rendered upright/regular by default.
  - Text explicitly enclosed in `*italics*` continues to render in italics.
- **How to use:**
  - Use standard markdown blockquotes:
    ```markdown
    > This is standard upright quote text.
    > 
    > If you need *italics*, just wrap specific words in asterisks.
    ```

---

## #7 Circular Author Photo in About Section
**Status:** ✅ **Solved**

- **What was changed:**
  - Added an optional circular author photo container in `src/pages/about.astro` positioned directly between **"ABOUT"** and the first paragraph.
  - Styled with circular border-radius (`50%`), hairline border, soft shadow, and subtle hover scale.
  - Only renders if `profile.avatar` is defined in `src/site.config.ts`. If undefined or empty, it hides completely (non-mandatory).
- **Files Modified:** [`src/pages/about.astro`](file:///home/ayush/ankurPortfolio/src/pages/about.astro), [`public/avatar.png`](file:///home/ayush/ankurPortfolio/public/avatar.png)
- **How to verify:**
  - Visit [`http://localhost:4321/about/`](http://localhost:4321/about/).
  - A circular portrait appears right beneath the "ABOUT" label.
- **How to use:**
  - Replace `public/avatar.png` with your photo.
  - To hide the photo, set `avatar: ""` or remove `avatar` under `profile` in `src/site.config.ts`.

---

## #8 Hide RSS Links from Homepage and Footers
**Status:** ✅ **Solved**

- **What was changed:**
  - Removed the `RSS` link and trailing separator from `src/components/layout/Footer.astro`. The footer right side now cleanly displays only `Tags`.
  - Removed the `RSS` link from `src/pages/index.astro` and refactored social links (GitHub · LinkedIn · Email) to use clean dot separators without trailing dots.
- **Files Modified:** [`src/components/layout/Footer.astro`](file:///home/ayush/ankurPortfolio/src/components/layout/Footer.astro), [`src/pages/index.astro`](file:///home/ayush/ankurPortfolio/src/pages/index.astro)
- **How to verify:**
  - Check homepage ([`http://localhost:4321/`](http://localhost:4321/)): social row shows only **GitHub · LinkedIn · Email** (RSS is hidden).
  - Check footers across all pages: bottom-right corner shows only **Tags** (RSS is hidden).

---

## Quick Reference Commands

| Task | Command |
| :--- | :--- |
| **Start Local Development** | `npm run dev` (visit `http://localhost:4321`) |
| **Type & Template Diagnostics** | `npm run check` |
| **Build for Production** | `npm run build` |
| **Preview Production Build** | `npm run preview` |
