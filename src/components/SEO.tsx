import Head from 'next/head'

interface SEOProps {
  title: string
  description: string
  noindex?: boolean
  ogImage?: string
  canonicalUrl?: string
  type?: 'website' | 'article'
  author?: string
  publishedTime?: string
  modifiedTime?: string
}

export function SEO({
  title,
  description,
  noindex = false,
  ogImage = '/og-image.png',
  canonicalUrl,
  type = 'website',
  author,
  publishedTime,
  modifiedTime
}: SEOProps) {
  const fullTitle = title === 'FreedomPress Core' ? title : `${title} | FreedomPress Core`
  
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {author && <meta name="author" content={author} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      
      <link rel="icon" href="/favicon.ico" />
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": type === 'article' ? "Article" : "WebSite",
            "name": fullTitle,
            "description": description,
            ...(author && { "author": { "@type": "Person", "name": author } }),
            ...(publishedTime && { "datePublished": publishedTime }),
            ...(modifiedTime && { "dateModified": modifiedTime })
          })
        }}
      />
    </Head>
  )
}