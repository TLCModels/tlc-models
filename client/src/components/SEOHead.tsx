import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const GA_MEASUREMENT_ID = 'G-0T937F6M3H';

export default function SEOHead({
  title = 'TLC Models | Elite Talent Staffing for Premium Events',
  description = 'TLC Models provides elite promotional models, brand ambassadors, and event staff for F1, FIFA, SEMA, trade shows, and corporate events across Las Vegas, Miami, and nationwide.',
  canonical = 'https://www.tlcmodels.com/',
  keywords = 'event staffing, promotional models, brand ambassadors, trade show models, F1 grid girls, FIFA event staff, Las Vegas models, Miami models, corporate event staff, talent agency',
  ogImage = 'https://d16ord51ny0id1.cloudfront.net/brand-assets/tlc-models-og.webp',
  ogType = 'website',
  noIndex = false,
}: SEOHeadProps) {
  const structuredDataOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TLC Models',
    url: 'https://www.tlcmodels.com',
    logo: 'https://d16ord51ny0id1.cloudfront.net/brand-assets/tlc-models-logo.svg',
    description,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-702-555-0100',
      contactType: 'sales',
      areaServed: 'US',
      availableLanguage: 'English',
    },
    sameAs: [
      'https://www.instagram.com/tlcmodels',
      'https://www.linkedin.com/company/tlcmodels',
      'https://www.facebook.com/tlcmodels',
    ],
  };

  const structuredDataWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TLC Models',
    url: 'https://www.tlcmodels.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.tlcmodels.com/talent?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const structuredDataBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tlcmodels.com/' },
      { '@type': 'ListItem', position: 2, name: 'Talent', item: 'https://www.tlcmodels.com/talent' },
      { '@type': 'ListItem', position: 3, name: 'Services', item: 'https://www.tlcmodels.com/services' },
      { '@type': 'ListItem', position: 4, name: 'Contact', item: 'https://www.tlcmodels.com/contact' },
    ],
  };

  const structuredDataFAQ = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What types of events does TLC Models staff?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TLC Models provides elite talent for F1 races, FIFA tournaments, SEMA, CES, trade shows, corporate events, product launches, nightclub promotions, and private VIP events across the United States.',
        },
      },
      {
        '@type': 'Question',
        name: 'How quickly can TLC Models staff an event?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We can staff most events within 48-72 hours with our roster of 3,100+ pre-vetted talent. For mega-events like F1 and FIFA, we recommend 4-6 weeks advance booking.',
        },
      },
      {
        '@type': 'Question',
        name: 'What cities does TLC Models serve?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our primary markets are Las Vegas and Miami, with nationwide coverage across all major US cities including Los Angeles, New York, Dallas, Chicago, and Atlanta.',
        },
      },
    ],
  };

  return (
    <Helmet>
      {/* Google Analytics -- must be first in <head> */}
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script>{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}</script>

      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="TLC Models" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">{JSON.stringify(structuredDataOrg)}</script>
      <script type="application/ld+json">{JSON.stringify(structuredDataWebsite)}</script>
      <script type="application/ld+json">{JSON.stringify(structuredDataBreadcrumb)}</script>
      <script type="application/ld+json">{JSON.stringify(structuredDataFAQ)}</script>
    </Helmet>
  );
}
