// API response types that include Prisma relations

export interface SiteWithStats {
  id: string;
  domain: string;
  name: string;
  sitemapUrl: string | null;
  gscPropertyId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    pages: number;
    crawls: number;
    keywords: number;
    speedTests: number;
  };
  crawls: {
    id: string;
    status: string;
    pagesFound: number;
    issuesFound: number;
    startedAt: string;
    completedAt: string | null;
  }[];
  speedTests: {
    performanceScore: number;
    strategy: string;
    createdAt: string;
  }[];
}

export interface SiteFormData {
  name: string;
  domain: string;
  sitemapUrl?: string;
  gscPropertyId?: string;
}
