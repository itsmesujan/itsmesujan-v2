import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE } from '@/data/content'

interface Seo {
  title: string
  description: string
  path: string
  /** JSON-LD object injected as a <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown>
}

const ORIGIN = 'https://itsmesujan.me'
export const ORIGIN_SITE = ORIGIN

function upsertMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    const [key, val] = attr.split('=')
    if (key && val) el.setAttribute(key, val)
    document.head.appendChild(el)
  }
  el.content = value
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Per-route document head: title, description, canonical, Open Graph and
 * optional JSON-LD. Replaces rather than appends, so navigating between six
 * routes never leaves stale metadata behind.
 */
export function useSeo({ title, description, path, jsonLd }: Seo) {
  const { pathname } = useLocation()
  const url = `${ORIGIN}${path === '/' ? '' : path}`

  useEffect(() => {
    document.title = title
    upsertMeta('meta[name="description"]', 'name="description"', description)
    upsertLink('canonical', url)
    upsertMeta('meta[property="og:title"]', 'property="og:title"', title)
    upsertMeta(
      'meta[property="og:description"]',
      'property="og:description"',
      description,
    )
    upsertMeta('meta[property="og:url"]', 'property="og:url"', url)
    upsertMeta(
      'meta[name="twitter:title"]',
      'name="twitter:title"',
      title,
    )
    upsertMeta(
      'meta[name="twitter:description"]',
      'name="twitter:description"',
      description,
    )

    document
      .querySelectorAll('script[data-seo-jsonld]')
      .forEach((n) => n.remove())

    if (jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.seoJsonld = 'true'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
  }, [title, description, url, jsonLd, pathname])
}

/** Organization/Person graph used site-wide. */
export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.person,
    alternateName: SITE.name,
    url: ORIGIN,
    email: `mailto:${SITE.email}`,
    jobTitle: SITE.role,
    sameAs: [SITE.github],
    knowsAbout: [
      'Agent orchestration',
      'Model routing',
      'Three.js',
      'WebGL',
      'TypeScript',
    ],
  }
}

/**
 * A list page's structured data. Every entry is wrapped as a real
 * schema.org ListItem with an explicit position, which is what search
 * engines actually read for a portfolio index.
 */
export function collectionJsonLd(
  type: 'ItemList' | 'CollectionPage',
  name: string,
  items: Record<string, unknown>[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item,
    })),
  }
}

/** Contact page: the address is a real, reachable mailbox — not a placeholder. */
export function contactJsonLd(email: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact',
    url: `${ORIGIN}/contact`,
    mainEntity: {
      '@type': 'Person',
      name: SITE.person,
      email: `mailto:${email}`,
    },
  }
}
