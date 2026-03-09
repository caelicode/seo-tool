/**
 * SEO Issue Resolution Guides
 *
 * Each issue type detected by the crawler has a corresponding guide
 * with a description, impact level, and step-by-step fix instructions.
 */

export interface IssueGuide {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  howToFix: string[];
  resources: { label: string; url: string }[];
}

export const issueGuides: Record<string, IssueGuide> = {
  missing_title: {
    title: "Missing Page Title",
    description:
      "The page does not have a <title> tag. Page titles are one of the most important on-page SEO factors. They appear in search results as the clickable headline and in browser tabs.",
    impact: "high",
    howToFix: [
      "Add a <title> tag inside the <head> section of your HTML.",
      "Keep it between 50 and 60 characters for optimal display in search results.",
      "Include your primary target keyword near the beginning.",
      "Make it unique and descriptive for each page.",
      'Example: <title>Hair Braiding Services in Forney TX | Your Salon Name</title>',
    ],
    resources: [
      {
        label: "Google: Title Links",
        url: "https://developers.google.com/search/docs/appearance/title-link",
      },
    ],
  },

  short_title: {
    title: "Title Too Short",
    description:
      "The page title is under 10 characters. Short titles miss opportunities to include keywords and may not be descriptive enough for search engines or users.",
    impact: "medium",
    howToFix: [
      "Expand the title to 50-60 characters.",
      "Include your primary keyword and a secondary keyword if natural.",
      "Add your brand name after a separator (e.g., | or -).",
      'Example: Instead of "Home", use "Professional Hair Braiding in Forney TX | Salon Name".',
    ],
    resources: [
      {
        label: "Moz: Title Tag Best Practices",
        url: "https://moz.com/learn/seo/title-tag",
      },
    ],
  },

  long_title: {
    title: "Title Too Long",
    description:
      "The page title exceeds 60 characters. Google typically displays 50-60 characters of a title tag. Longer titles get truncated with an ellipsis (...) in search results.",
    impact: "low",
    howToFix: [
      "Shorten the title to under 60 characters.",
      "Keep the most important keywords and information at the beginning.",
      "Remove filler words like 'the', 'a', 'and' where possible.",
      "Consider removing the brand name if the title is still too long.",
    ],
    resources: [
      {
        label: "Google: Title Links",
        url: "https://developers.google.com/search/docs/appearance/title-link",
      },
    ],
  },

  missing_meta_description: {
    title: "Missing Meta Description",
    description:
      "The page has no meta description tag. While not a direct ranking factor, meta descriptions influence click-through rates from search results. Google may auto-generate one, but it is usually less compelling.",
    impact: "high",
    howToFix: [
      'Add a <meta name="description" content="..."> tag in the <head> section.',
      "Write 150-160 characters that accurately summarize the page content.",
      "Include your target keyword naturally.",
      "Write it as a compelling call to action to encourage clicks.",
      'Example: <meta name="description" content="Professional hair braiding, locs, and installations in Forney TX. Book your appointment today for stunning styles at affordable prices.">',
    ],
    resources: [
      {
        label: "Google: Meta Descriptions",
        url: "https://developers.google.com/search/docs/appearance/snippet",
      },
    ],
  },

  short_meta_description: {
    title: "Meta Description Too Short",
    description:
      "The meta description is under 50 characters. Short descriptions don't provide enough information to entice users to click through from search results.",
    impact: "medium",
    howToFix: [
      "Expand to 150-160 characters.",
      "Describe what the page offers and why users should visit.",
      "Include a call to action (e.g., 'Book now', 'Learn more', 'Get a free quote').",
      "Include your primary keyword and location if relevant.",
    ],
    resources: [],
  },

  long_meta_description: {
    title: "Meta Description Too Long",
    description:
      "The meta description exceeds 160 characters. Google truncates descriptions longer than about 155-160 characters, which may cut off important information.",
    impact: "low",
    howToFix: [
      "Trim to 155-160 characters.",
      "Front-load the most important information.",
      "Keep the call to action within the visible portion.",
    ],
    resources: [],
  },

  missing_h1: {
    title: "Missing H1 Heading",
    description:
      "The page has no <h1> tag. The H1 heading is the main heading of your page and helps both users and search engines understand what the page is about.",
    impact: "high",
    howToFix: [
      "Add exactly one <h1> tag to the page.",
      "Place it near the top of the page content.",
      "Make it descriptive and include your primary keyword.",
      "It should be different from (but related to) the page title.",
      'Example: <h1>Professional Hair Braiding Services in Forney, Texas</h1>',
    ],
    resources: [
      {
        label: "Google: Headings",
        url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide#use-headings",
      },
    ],
  },

  multiple_h1: {
    title: "Multiple H1 Headings",
    description:
      "The page has more than one <h1> tag. While HTML5 technically allows multiple H1s, best practice for SEO is to have a single H1 that clearly defines the page topic.",
    impact: "medium",
    howToFix: [
      "Keep only one <h1> tag per page.",
      "Convert additional H1 tags to <h2> or <h3> as appropriate.",
      "Ensure the remaining H1 accurately describes the main topic.",
      "Use a proper heading hierarchy: H1 > H2 > H3 > H4.",
    ],
    resources: [],
  },

  missing_alt_text: {
    title: "Images Missing Alt Text",
    description:
      "One or more images on this page are missing alt attributes. Alt text helps search engines understand images, improves accessibility for screen readers, and serves as placeholder text if images fail to load.",
    impact: "medium",
    howToFix: [
      "Add descriptive alt attributes to all <img> tags.",
      "Describe what the image shows in 5-15 words.",
      "Include relevant keywords where natural, but avoid keyword stuffing.",
      "For decorative images, use an empty alt (alt=\"\") rather than omitting it.",
      'Example: <img src="braids.jpg" alt="Knotless box braids hairstyle by Yuri\'s Beauty Parlor">',
    ],
    resources: [
      {
        label: "Google: Image SEO",
        url: "https://developers.google.com/search/docs/appearance/google-images",
      },
    ],
  },

  missing_canonical: {
    title: "Missing Canonical Tag",
    description:
      "The page does not have a canonical link tag. Canonical tags tell search engines which version of a page is the preferred one, helping prevent duplicate content issues.",
    impact: "low",
    howToFix: [
      'Add <link rel="canonical" href="https://yourdomain.com/page-url"> in the <head>.',
      "The canonical URL should be the full, absolute URL of the preferred page version.",
      "Self-referencing canonicals (pointing to the current page) are recommended.",
      "Ensure consistency: if you choose www, use it everywhere.",
    ],
    resources: [
      {
        label: "Google: Canonical Tags",
        url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
      },
    ],
  },

  noindex_nofollow: {
    title: "Page Has Noindex/Nofollow",
    description:
      "The page has a meta robots tag with noindex or nofollow directives. This means search engines are instructed not to index this page or not to follow its links.",
    impact: "low",
    howToFix: [
      "If this page should appear in search results, remove the noindex directive.",
      "If this page should pass link equity, remove the nofollow directive.",
      "If the directives are intentional (e.g., for thank-you pages, admin pages), no action needed.",
      "Common cases where noindex is correct: login pages, search result pages, thank-you pages.",
    ],
    resources: [
      {
        label: "Google: Robots Meta Tag",
        url: "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag",
      },
    ],
  },

  missing_og_tags: {
    title: "Missing Open Graph Tags",
    description:
      "The page is missing og:title and/or og:description tags. Open Graph tags control how your page appears when shared on social media platforms like Facebook, LinkedIn, and Twitter.",
    impact: "low",
    howToFix: [
      "Add og:title, og:description, og:image, and og:url meta tags.",
      'Example: <meta property="og:title" content="Your Page Title">',
      'Example: <meta property="og:description" content="Your page description">',
      'Example: <meta property="og:image" content="https://yourdomain.com/image.jpg">',
      "Use images that are at least 1200x630 pixels for best display on social platforms.",
    ],
    resources: [
      {
        label: "Open Graph Protocol",
        url: "https://ogp.me/",
      },
    ],
  },

  broken_link: {
    title: "Broken Link Detected",
    description:
      "A link on your site points to a page that returns an error (4xx or 5xx status). Broken links hurt user experience and can waste search engine crawl budget.",
    impact: "high",
    howToFix: [
      "Find the page containing the broken link (listed in the issue detail).",
      "Either fix the link URL to point to a working page, or remove the link.",
      "If the target page was moved, update the link to the new URL.",
      "If the target page was deleted, set up a 301 redirect to a relevant alternative page.",
      "Consider using a tool to regularly check for broken links.",
    ],
    resources: [
      {
        label: "Google: Fix Broken Links",
        url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors",
      },
    ],
  },

  http_error: {
    title: "HTTP Error Response",
    description:
      "The page returned an HTTP error status code (4xx or 5xx). This means the page is not accessible, which affects both users and search engine crawling.",
    impact: "high",
    howToFix: [
      "Check the specific HTTP status code in the issue detail.",
      "For 404 errors: restore the page or set up a 301 redirect.",
      "For 500 errors: check server logs for the underlying application error.",
      "For 403 errors: review file permissions and authentication settings.",
      "Ensure your server is properly configured and has adequate resources.",
    ],
    resources: [
      {
        label: "HTTP Status Codes Reference",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status",
      },
    ],
  },

  fetch_error: {
    title: "Page Fetch Failed",
    description:
      "The crawler could not fetch this page at all. This could be due to DNS issues, server timeouts, SSL certificate problems, or the server being down.",
    impact: "high",
    howToFix: [
      "Verify the URL is correct and the page exists.",
      "Check that your server is running and accessible.",
      "Verify DNS settings are configured correctly.",
      "Check SSL/TLS certificate validity if using HTTPS.",
      "Ensure your server is not blocking the crawler's user agent.",
      "Check for firewall rules that might block automated requests.",
    ],
    resources: [],
  },
};

/**
 * Get the resolution guide for an issue type.
 * Returns a generic guide if the type is not recognized.
 */
export function getIssueGuide(issueType: string): IssueGuide {
  return (
    issueGuides[issueType] || {
      title: issueType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: "This SEO issue was detected during the crawl.",
      impact: "medium" as const,
      howToFix: [
        "Review the issue detail for specific information.",
        "Consult Google's SEO documentation for best practices.",
      ],
      resources: [
        {
          label: "Google SEO Starter Guide",
          url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
        },
      ],
    }
  );
}
