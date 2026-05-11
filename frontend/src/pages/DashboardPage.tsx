import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText, Loader2, BarChart3, Calendar, X, ArrowUpRight,
} from 'lucide-react';
import { api } from '../api';

interface ContentItem {
  id: number;
  channel: string;
  content_text: string;
  status: string;
  posted_at: string | null;
  external_id?: string | null;
}

interface ContentKpi {
  totalPosts: number;
  totalImpressions: number;
  avgEngagementRate: number;
}

const CHANNEL_LABELS: Record<string, string> = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  facebook: 'Facebook',
  blog_naver: '네이버',
  blog_tistory: '티스토리',
  email: 'Email',
};

const CHANNEL_DOTS: Record<string, string> = {
  twitter: 'bg-sky-500',
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-600',
  blog_naver: 'bg-emerald-500',
  blog_tistory: 'bg-orange-500',
  email: 'bg-amber-500',
};

const ALL_CHANNELS = ['twitter', 'instagram', 'facebook', 'blog_naver', 'blog_tistory', 'email'];

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function SectionHeading({
  children,
  action,
  className = '',
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between mb-4 ${className}`}>
      <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-surface-200">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function DashboardPage() {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(false);

  const [contentKpi, setContentKpi] = useState<ContentKpi | null>(null);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);

  const [ga4Overview, setGa4Overview] = useState<any>(null);
  const [ga4Channels, setGa4Channels] = useState<any[]>([]);
  const [ga4Configured, setGa4Configured] = useState(false);

  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportContents, setReportContents] = useState<Record<string, string>>({});
  const [reportModal, setReportModal] = useState<{ title: string; date: string; content: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [summary, recent] = await Promise.all([
          api.analytics.summary(period).catch(() => null),
          api.content.recent(10).catch(() => null),
        ]);

        if (cancelled) return;

        if (summary) {
          setContentKpi({
            totalPosts: summary.count ?? 0,
            totalImpressions: summary.total_impressions ?? 0,
            avgEngagementRate: summary.avg_engagement_rate ?? 0,
          });
        } else {
          setContentKpi(null);
        }

        if (recent && Array.isArray(recent) && recent.length > 0) {
          setRecentContent(recent);
        } else {
          setRecentContent([]);
        }

        api.ga4.status().then((res) => {
          if (cancelled) return;
          setGa4Configured(res.configured);
          if (res.configured) {
            api.ga4.overview(period).then((r) => { if (!cancelled) setGa4Overview(r.data); }).catch(() => {});
            api.ga4.trafficChannels(period).then((r) => { if (!cancelled) setGa4Channels(r.data || []); }).catch(() => {});
          }
        }).catch(() => {});

        setReportsLoading(true);
        api.reports.list().then((res) => {
          if (cancelled) return;
          setReports(Array.isArray(res) ? res.slice(0, 5) : []);
        }).catch(() => {
          if (!cancelled) setReports([]);
        }).finally(() => {
          if (!cancelled) setReportsLoading(false);
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [period]);

  const periodLabels: Record<string, string> = { '24h': '24시간', '7d': '7일', '30d': '30일' };

  return (
    <div className="space-y-12 pb-8">
      {/* ═══ Page Header ═══════════════════════════════════════════ */}
      <header>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[24px] font-bold text-surface-50 tracking-tight leading-none">대시보드</h1>
            <p className="text-[14px] text-surface-200 mt-2">마케팅 성과 요약 · {periodLabels[period]}</p>
          </div>
          <div className="flex items-center gap-3">
            {loading && <Loader2 className="w-3.5 h-3.5 text-surface-200 animate-spin" />}
            <div className="flex items-center gap-4 text-[14px]">
              {Object.entries(periodLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`relative pb-1 font-medium transition-colors ${
                    period === key ? 'text-surface-50' : 'text-surface-300 hover:text-surface-100'
                  }`}
                >
                  {label}
                  {period === key && (
                    <span className="absolute bottom-0 left-0 right-0 h-px bg-primary-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ KPI Row — 박스 없이 한 줄에 큰 숫자 ═══════════════════════ */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-12 gap-y-6">
          <KpiBlock
            label="전체 게시물"
            value={contentKpi ? contentKpi.totalPosts.toLocaleString() : '—'}
          />
          <KpiBlock
            label="노출수"
            value={contentKpi ? (contentKpi.totalImpressions ?? 0).toLocaleString() : '—'}
          />
          <KpiBlock
            label="평균 참여율"
            value={contentKpi ? `${contentKpi.avgEngagementRate}%` : '—'}
          />
        </div>
      </section>

      {/* ═══ Channel Activity ════════════════════════════════════════ */}
      <section>
        <SectionHeading>채널별 활동</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-5">
          {ALL_CHANNELS.map((ch) => {
            const items = recentContent.filter((c) => c.channel === ch);
            const today = items.filter((c) => {
              if (!c.posted_at) return false;
              return new Date(c.posted_at).toDateString() === new Date().toDateString();
            });
            return (
              <div key={ch}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${CHANNEL_DOTS[ch]}`} />
                  <span className="text-[14px] font-medium text-surface-600">{CHANNEL_LABELS[ch]}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[18px] font-bold text-surface-50 tabular-nums tracking-tight leading-none">
                    {today.length}
                  </span>
                  <span className="text-[14px] text-surface-200 tabular-nums">/ {items.length}</span>
                </div>
                <p className="text-[12.5px] text-surface-300 mt-1.5">오늘 / 전체</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ Recent Content ══════════════════════════════════════════ */}
      <section>
        <SectionHeading
          action={
            <a
              href="/content"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-surface-600 hover:text-surface-50 transition-colors"
            >
              전체 보기 <ArrowUpRight className="w-3 h-3" />
            </a>
          }
        >
          최근 콘텐츠
        </SectionHeading>

        {recentContent.length === 0 ? (
          <div className="py-12 text-center border-t border-surface-800">
            <FileText className="w-7 h-7 text-surface-600 mx-auto mb-2.5" />
            <p className="text-[14px] text-surface-200">아직 데이터가 없습니다</p>
            <p className="text-[11.5px] text-surface-200 mt-1">콘텐츠를 생성하고 게시하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="border-t border-surface-800">
            {recentContent.slice(0, 5).map((item) => (
              <a
                key={item.id}
                href={`/content/${item.id}`}
                className="group flex items-center gap-4 py-3 border-b border-surface-800 hover:bg-surface-800/40 transition-colors -mx-2 px-2 rounded"
              >
                <span className="flex items-center gap-1.5 w-[100px] flex-shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${CHANNEL_DOTS[item.channel] ?? 'bg-surface-400'}`} />
                  <span className="text-[14px] text-surface-600 truncate">{CHANNEL_LABELS[item.channel] ?? item.channel}</span>
                </span>
                <span className="text-[14px] text-surface-100 truncate flex-1 group-hover:text-surface-50">
                  {item.content_text}
                </span>
                <span className={`text-[14px] font-medium tabular-nums flex-shrink-0 ${
                  item.status === 'posted' ? 'text-emerald-600' :
                  item.status === 'failed' ? 'text-red-600' :
                  'text-amber-600'
                }`}>
                  {item.status === 'posted' ? '발행됨' : item.status === 'queued' ? '대기 중' : item.status === 'failed' ? '실패' : item.status}
                </span>
                <span className="text-[11.5px] text-surface-200 w-20 text-right tabular-nums flex-shrink-0">
                  {formatRelative(item.posted_at ?? item.posted_at)}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* ═══ GA4 — conditional ═══════════════════════════════════════ */}
      {ga4Configured && ga4Overview && (
        <section>
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <BarChart3 className="w-3 h-3" />
              Google Analytics
            </span>
          </SectionHeading>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {[
                { label: '세션',     value: ga4Overview.sessions || '0' },
                { label: '사용자',   value: ga4Overview.totalUsers || '0' },
                { label: '페이지뷰', value: ga4Overview.screenPageViews || '0' },
                { label: '전환수',   value: ga4Overview.conversions || '0' },
              ].map((item) => (
                <KpiBlock key={item.label} label={item.label} value={Number(item.value).toLocaleString()} size="sm" />
              ))}
            </div>

            <div>
              <p className="text-[14px] font-medium text-surface-200 mb-3">채널별 트래픽</p>
              {ga4Channels.length > 0 ? (
                <div className="space-y-2.5">
                  {ga4Channels.slice(0, 8).map((ch, i) => {
                    const sessions = Number(ch.sessions || 0);
                    const max = Number(ga4Channels[0]?.sessions || 1);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[14px] text-surface-600 w-32 truncate">{ch.sessionDefaultChannelGroup}</span>
                        <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-surface-700 rounded-full transition-all"
                            style={{ width: `${(sessions / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-[14px] font-medium text-surface-200 tabular-nums w-14 text-right">{sessions.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[14px] text-surface-200">채널 데이터가 없습니다</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ Recent Reports ══════════════════════════════════════════ */}
      <section>
        <SectionHeading
          action={reportsLoading ? <Loader2 className="w-3 h-3 text-surface-200 animate-spin" /> : undefined}
        >
          최근 리포트
        </SectionHeading>

        {reportsLoading ? (
          <div className="py-10 text-center border-t border-surface-800">
            <Loader2 className="w-5 h-5 text-surface-600 mx-auto animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center border-t border-surface-800">
            <FileText className="w-7 h-7 text-surface-600 mx-auto mb-2.5" />
            <p className="text-[14px] text-surface-200">아직 생성된 리포트가 없습니다</p>
            <p className="text-[11.5px] text-surface-200 mt-1">daily_analysis 스케줄을 활성화하면 자동 생성됩니다</p>
          </div>
        ) : (
          <div className="border-t border-surface-800">
            {reports.map((report) => {
              const filename: string = report.filename ?? report.name ?? String(report);
              const title: string = report.title ?? filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
              const date: string = report.created_at ?? report.date ?? '';
              const size: number | null = report.size ?? null;

              return (
                <button
                  key={filename}
                  onClick={() => {
                    if (reportContents[filename]) {
                      setReportModal({ title, date, content: reportContents[filename] });
                    } else {
                      api.reports.get(filename).then((data) => {
                        const content = typeof data === 'string' ? data : data.content ?? JSON.stringify(data, null, 2);
                        setReportContents((prev) => ({ ...prev, [filename]: content }));
                        setReportModal({ title, date, content });
                      });
                    }
                  }}
                  className="group w-full flex items-center gap-4 py-3 border-b border-surface-800 hover:bg-surface-800/40 transition-colors text-left -mx-2 px-2 rounded"
                >
                  <FileText className="w-3.5 h-3.5 text-surface-200 flex-shrink-0" />
                  <span className="text-[14px] font-medium text-surface-100 truncate flex-1 group-hover:text-surface-50">{title}</span>
                  {size != null && (
                    <span className="text-[14px] text-surface-200 tabular-nums flex-shrink-0">
                      {size < 1024 ? `${size}B` : `${(size / 1024).toFixed(1)}KB`}
                    </span>
                  )}
                  {date && (
                    <span className="text-[11.5px] text-surface-200 tabular-nums flex-shrink-0 inline-flex items-center gap-1 w-24 justify-end">
                      <Calendar className="w-3 h-3" />
                      {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ Report Modal ════════════════════════════════════════════ */}
      {reportModal && (
        <div
          className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setReportModal(null)}
        >
          <div
            className="bg-surface-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-surface-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-surface-50 truncate">{reportModal.title}</h2>
                <p className="text-[13px] text-surface-300 mt-0.5">{reportModal.date}</p>
              </div>
              <button
                onClick={() => setReportModal(null)}
                className="p-1.5 hover:bg-surface-800 rounded-lg text-surface-300 hover:text-surface-100 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(85vh-72px)] report-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportModal.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiBlock({
  label,
  value,
  size = 'lg',
}: {
  label: string;
  value: string | number;
  size?: 'lg' | 'sm';
}) {
  return (
    <div>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-surface-200 mb-2">
        {label}
      </p>
      <p
        className={`font-bold text-surface-50 tabular-nums leading-none tracking-tight ${
          size === 'lg' ? 'text-[28px]' : 'text-[18px]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
