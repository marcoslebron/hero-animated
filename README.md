# Lambda.ai Hero Clone

A pixel-faithful clone of the [Lambda.ai](https://lambda.ai) homepage hero section, built with Next.js 16, React 19, and Tailwind CSS 4.

**Live demo:** [[your-vercel-url.vercel.app](https://project-jcsvl.vercel.app/)]

## What's inside

- WebGL particle background powered by Unicorn Studio SDK (reverse-engineered from Lambda.ai's production bundle)
- Letter-swap animation: three characters cycle independently through a pixel font (`apkarchivr21`) with RGB chromatic-aberration highlight, matching Lambda's exact timing
- Full accessibility support: `prefers-reduced-motion` respected at both the JS and HTML layers
- GitHub Actions CI/CD pipeline: lint → test → build on every push, Vercel preview deployments on PRs, production deploy on merge to `main`

## Case study

For a full technical breakdown of how AI was used to reverse-engineer and replicate this effect, see [docs/CASE_STUDY.md](docs/CASE_STUDY.md).

## Dev commands

```bash
npm run dev      # dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint
npm run test     # Vitest
```

## Stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Unicorn Studio · Vercel
