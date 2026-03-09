"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Gauge,
  Play,
  Monitor,
  Smartphone,
  Clock,
  RefreshCw,
} from "lucide-react";

interface SpeedTestResult {
  id: string;
  siteId: string;
  url: string;
  strategy: string;
  performanceScore: number;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
  createdAt: string;
}

interface SpeedData {
  latestMobile: SpeedTestResult | null;
  latestDesktop: SpeedTestResult | null;
  history: SpeedTestResult[];
  mobile: SpeedTestResult[];
  desktop: SpeedTestResult[];
}

export default function SpeedPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [data, setData] = useState<SpeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null); // "mobile" | "desktop" | null
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/speed?siteId=${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch speed data");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runTest = async (strategy: "mobile" | "desktop") => {
    setTesting(strategy);
    setError(null);
    try {
      const res = await fetch("/api/speed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, strategy }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Test failed");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/sites/${siteId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PageSpeed Monitor</h1>
          <p className="mt-1 text-sm text-slate-500">
            Core Web Vitals and performance scores from Google PageSpeed Insights.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runTest("mobile")}
            disabled={testing !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            {testing === "mobile" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
            Test Mobile
          </button>
          <button
            onClick={() => runTest("desktop")}
            disabled={testing !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {testing === "desktop" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
            Test Desktop
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {testing && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Running {testing} PageSpeed test... This may take 15-30 seconds.
          </div>
        </div>
      )}

      {/* Latest scores */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <ScoreCard
          title="Mobile"
          icon={Smartphone}
          result={data?.latestMobile ?? null}
        />
        <ScoreCard
          title="Desktop"
          icon={Monitor}
          result={data?.latestDesktop ?? null}
        />
      </div>

      {/* Core Web Vitals detail */}
      {(data?.latestMobile || data?.latestDesktop) && (
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Core Web Vitals
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <VitalCard
              label="LCP"
              fullName="Largest Contentful Paint"
              mobile={data?.latestMobile?.lcp ?? null}
              desktop={data?.latestDesktop?.lcp ?? null}
              unit="ms"
              thresholds={[2500, 4000]}
            />
            <VitalCard
              label="INP"
              fullName="Interaction to Next Paint"
              mobile={data?.latestMobile?.inp ?? null}
              desktop={data?.latestDesktop?.inp ?? null}
              unit="ms"
              thresholds={[200, 500]}
            />
            <VitalCard
              label="CLS"
              fullName="Cumulative Layout Shift"
              mobile={data?.latestMobile?.cls ?? null}
              desktop={data?.latestDesktop?.cls ?? null}
              unit=""
              thresholds={[0.1, 0.25]}
              decimals={3}
            />
            <VitalCard
              label="TTFB"
              fullName="Time to First Byte"
              mobile={data?.latestMobile?.ttfb ?? null}
              desktop={data?.latestDesktop?.ttfb ?? null}
              unit="ms"
              thresholds={[800, 1800]}
            />
            <VitalCard
              label="FID"
              fullName="First Input Delay"
              mobile={data?.latestMobile?.fid ?? null}
              desktop={data?.latestDesktop?.fid ?? null}
              unit="ms"
              thresholds={[100, 300]}
            />
          </div>
        </div>
      )}

      {/* Test history */}
      {data && data.history.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Test History
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Strategy</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-right">LCP</th>
                    <th className="px-4 py-3 text-right">INP</th>
                    <th className="px-4 py-3 text-right">CLS</th>
                    <th className="px-4 py-3 text-right">TTFB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.history.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {new Date(test.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                            test.strategy === "mobile"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {test.strategy === "mobile" ? (
                            <Smartphone className="h-3 w-3" />
                          ) : (
                            <Monitor className="h-3 w-3" />
                          )}
                          {test.strategy}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ScoreBadge score={test.performanceScore} />
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {test.lcp !== null ? `${test.lcp}ms` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {test.inp !== null ? `${test.inp}ms` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {test.cls !== null ? test.cls.toFixed(3) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {test.ttfb !== null ? `${test.ttfb}ms` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {data && data.history.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <Gauge className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No speed tests yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Run a mobile or desktop test to see your Core Web Vitals and performance score.
          </p>
          <button
            onClick={() => runTest("mobile")}
            disabled={testing !== null}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Run First Test
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreCard({
  title,
  icon: Icon,
  result,
}: {
  title: string;
  icon: React.ElementType;
  result: SpeedTestResult | null;
}) {
  const score = result?.performanceScore ?? null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="flex items-center gap-6">
        <ScoreRing score={score} />
        <div className="space-y-1 text-sm">
          {result ? (
            <>
              <p className="text-slate-600">
                LCP: <span className="font-medium">{result.lcp ?? "-"}ms</span>
              </p>
              <p className="text-slate-600">
                CLS: <span className="font-medium">{result.cls?.toFixed(3) ?? "-"}</span>
              </p>
              <p className="text-slate-600">
                INP: <span className="font-medium">{result.inp ?? "-"}ms</span>
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {new Date(result.createdAt).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-slate-400">No test run yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;

  const color =
    score === null
      ? "#d4d4d8"
      : score >= 90
      ? "#16a34a"
      : score >= 50
      ? "#f59e0b"
      : "#dc2626";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-xl font-bold"
          style={{ color }}
        >
          {score !== null ? score : "?"}
        </span>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-green-50 text-green-700"
      : score >= 50
      ? "bg-amber-50 text-amber-700"
      : "bg-red-50 text-red-700";

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}

function VitalCard({
  label,
  fullName,
  mobile,
  desktop,
  unit,
  thresholds,
  decimals = 0,
}: {
  label: string;
  fullName: string;
  mobile: number | null;
  desktop: number | null;
  unit: string;
  thresholds: [number, number]; // [good, poor]
  decimals?: number;
}) {
  const getColor = (val: number | null) => {
    if (val === null) return "text-slate-400";
    if (val <= thresholds[0]) return "text-green-600";
    if (val <= thresholds[1]) return "text-amber-600";
    return "text-red-600";
  };

  const formatVal = (val: number | null) => {
    if (val === null) return "-";
    return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-400">{fullName}</p>
      </div>
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-slate-500">Mobile</p>
          <p className={`text-lg font-bold ${getColor(mobile)}`}>
            {formatVal(mobile)}{unit && mobile !== null ? unit : ""}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Desktop</p>
          <p className={`text-lg font-bold ${getColor(desktop)}`}>
            {formatVal(desktop)}{unit && desktop !== null ? unit : ""}
          </p>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-400">
        Good: &le;{thresholds[0]}{unit} / Poor: &gt;{thresholds[1]}{unit}
      </div>
    </div>
  );
}
