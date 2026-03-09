"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  Activity,
  Search,
  Target,
  Gauge,
  Sparkles,
  Users,
  Link2,
  Map,
  Code,
  PenTool,
  Tags,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

const mainNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sites", label: "Sites", icon: Globe },
];

const siteNav = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/crawl", label: "Site Crawler", icon: Activity },
  { href: "/search", label: "Search Console", icon: Search },
  { href: "/keywords", label: "Keywords", icon: Target },
  { href: "/speed", label: "PageSpeed", icon: Gauge },
  { href: "/content", label: "Content Optimizer", icon: Sparkles },
  { href: "/competitors", label: "Competitors", icon: Users },
  { href: "/backlinks", label: "Backlinks", icon: Link2 },
  { href: "/sitemap", label: "Sitemap", icon: Map },
  { href: "/schema", label: "Schema Markup", icon: Code },
  { href: "/content-engine", label: "Content Engine", icon: PenTool },
  { href: "/meta-optimizer", label: "Meta Optimizer", icon: Tags },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const siteId = params?.siteId as string | undefined;

  const isOnSitePage = pathname.startsWith("/sites/") && siteId;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-slate-200/60 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <Link href="/" className="flex flex-col">
          <span className="text-sm font-bold text-slate-900">SEO Tool</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Internal
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Main nav */}
        <div className="mb-2">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </p>
          {mainNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || (item.href === "/sites" && pathname === "/sites");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-50 to-violet-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-blue-400" />}
              </Link>
            );
          })}
        </div>

        {/* Site-specific nav */}
        {isOnSitePage && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Site Tools
            </p>
            {siteNav.map((item) => {
              const fullHref = `/sites/${siteId}${item.href}`;
              const isActive = item.href === ""
                ? pathname === `/sites/${siteId}`
                : pathname === fullHref || pathname.startsWith(fullHref + "/");
              return (
                <Link
                  key={item.href}
                  href={fullHref}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-violet-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-violet-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-blue-800">AI Powered</p>
          <p className="mt-0.5 text-[10px] text-blue-600">
            GPT-4.1 mini + Claude
          </p>
        </div>
      </div>
    </aside>
  );
}
