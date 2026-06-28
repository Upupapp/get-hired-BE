# GETHIRED_JOB_MEDIA_V3_FIX_LOG
Command: GETHIRED_JOB_POSTING_HERO_MEDIA_SHARE_PREVIEW_PUBLIC_DETAIL_FULLSTACK_V3
Date: 2026-06-28

## Phase 0 — Repo safety
- FE branch: master (HEAD 3b73430)
- BE branch: main (HEAD 9a3751b)
- Pre-existing FE modified files: none
- Pre-existing BE modified files: untracked output docs only
- No unrelated changes discarded

## Changes made — Frontend (src/app/)

### public-details.component.ts
- Added ogImage: job.jobBanner to setPageMeta() call (falls back to DEFAULT_OG_IMAGE when undefined)
- Added ogImageAlt: job title + company name to setPageMeta() call

### core/services/seo.service.ts
- Added ogImageAlt?: string to PageMetaConfig interface
- Added ogImageAlt to setPageMeta() destructuring
- Added og:image:secure_url meta tag (same URL as og:image, required by some crawlers)
- Added og:image:alt meta tag when ogImageAlt provided
- Added twitter:image:alt meta tag when ogImageAlt provided
- Added image: job.jobBanner spread to setJobPostingJsonLd() JSON-LD object (only when truthy)

### jobs/job-posts-details/job-posts-details.component.html
- Added gh-job-hero-media block: <img fetchpriority="high" loading="eager"> with gradient overlay and text
- Added ng-template #cssHeroBanner fallback: original .bg-banner CSS section preserved
- *ngIf="selectedJobPost?.jobBanner" toggles between real image and CSS fallback

### jobs/job-posts-details/job-posts-details.component.scss
- Added .gh-job-hero-media, .gh-job-hero-img, .gh-job-hero-overlay, .gh-job-hero-text classes
- aspect-ratio: 3/1 desktop (16/9 mobile), max-height 420px
- Gradient overlay for text contrast
- @keyframes gh-hero-img-reveal (reduced-motion guarded)

## Build result
- ng build --prod: SUCCESS
- Hash: 2fcb705bfae3bd4d
- 0 errors, pre-existing autoprefixer warnings only (not related to V3)

## Preserved
- Existing .bg-banner CSS path unchanged (ng-template fallback)
- Existing apply/login button behavior unchanged
- Existing share functionality unchanged
- Existing JSON-LD logic unchanged except adding image field
- Existing OG logic unchanged except adding secure_url, alt, and job-specific image
