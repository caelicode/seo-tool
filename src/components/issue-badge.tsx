"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface IssueBadgeProps {
  severity: string;
  className?: string;
}

const config = {
  critical: {
    icon: AlertCircle,
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "Warning",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    label: "Info",
  },
} as const;

export function IssueBadge({ severity, className = "" }: IssueBadgeProps) {
  const cfg = config[severity as keyof typeof config] || config.info;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

interface IssueTypeBadgeProps {
  type: string;
}

const typeLabels: Record<string, string> = {
  missing_title: "Missing Title",
  short_title: "Short Title",
  long_title: "Long Title",
  missing_meta_description: "Missing Meta Description",
  short_meta_description: "Short Meta Description",
  long_meta_description: "Long Meta Description",
  missing_h1: "Missing H1",
  multiple_h1: "Multiple H1s",
  missing_alt_text: "Missing Alt Text",
  missing_canonical: "Missing Canonical",
  missing_og_tags: "Missing OG Tags",
  noindex_nofollow: "Noindex/Nofollow",
  broken_link: "Broken Link",
  http_error: "HTTP Error",
  fetch_error: "Fetch Error",
};

export function IssueTypeBadge({ type }: IssueTypeBadgeProps) {
  const label = typeLabels[type] || type.replace(/_/g, " ");
  return (
    <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
      {label}
    </span>
  );
}
