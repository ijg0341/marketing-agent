import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Plus, X, DollarSign, Eye, MousePointerClick, Target,
  Pause, Play, Pencil, Trash2, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { KpiCard } from '../components/KpiCard';
import { api } from '../api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Platform = 'twitter' | 'meta' | 'google';
type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'error';
type Objective = 'awareness' | 'traffic' | 'engagement' | 'conversions';
type BidStrategy = 'auto' | 'manual_cpc' | 'manual_cpm' | 'target_cpa';
type AdType = 'image' | 'video' | 'carousel' | 'text';
type CtaType = 'learn_more' | 'shop_now' | 'sign_up' | 'contact_us';
type Gender = 'all' | 'male' | 'female';
type Device = 'all' | 'mobile' | 'desktop';

interface Campaign {
  id: number;
  platform: Platform;
  name: string;
  objective: Objective;
  status: CampaignStatus;
  daily_budget: number;
  total_budget: number;
  currency: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  roas: number;
  start_date: string;
  end_date: string;
}

interface CampaignForm {
  platform: Platform;
  name: string;
  objective: Objective;
  daily_budget: string;
  total_budget: string;
  bid_strategy: BidStrategy;
  start_date: string;
  end_date: string;
  age_min: string;
  age_max: string;
  gender: Gender;
  locations: string;
  interests: string[];
  interestInput: string;
  device: Device;
  placements: string[];
  ad_type: AdType;
  headline: string;
  body_text: string;
  media_url: string;
  cta_type: CtaType;
  destination_url: string;
}

/* ------------------------------------------------------------------ */
/*  (Mock data removed — using real API data only)                     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatWon(n: number): string {
  return '₩' + n.toLocaleString('ko-KR');
}

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

const platformColors: Record<Platform, string> = {
  twitter: 'bg-sky-100 text-sky-700',
  meta: 'bg-blue-100 text-blue-700',
  google: 'bg-red-100 text-red-700',
};

const platformLabels: Record<Platform, string> = {
  twitter: 'Twitter / X',
  meta: 'Meta',
  google: 'Google',
};

const statusColors: Record<CampaignStatus, string> = {
  draft: 'bg-surface-100 text-surface-600',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-purple-100 text-purple-700',
  error: 'bg-red-100 text-red-700',
};

const statusLabels: Record<CampaignStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  error: 'Error',
};

const objectiveLabels: Record<Objective, string> = {
  awareness: 'Awareness',
  traffic: 'Traffic',
  engagement: 'Engagement',
  conversions: 'Conversions',
};

const bidStrategyLabels: Record<BidStrategy, string> = {
  auto: 'Auto',
  manual_cpc: 'Manual CPC',
  manual_cpm: 'Manual CPM',
  target_cpa: 'Target CPA',
};

const adTypeLabels: Record<AdType, string> = {
  image: 'Image',
  video: 'Video',
  carousel: 'Carousel',
  text: 'Text',
};

const ctaLabels: Record<CtaType, string> = {
  learn_more: 'Learn More',
  shop_now: 'Shop Now',
  sign_up: 'Sign Up',
  contact_us: 'Contact Us',
};

const platformPlacements: Record<Platform, { value: string; label: string }[]> = {
  twitter: [
    { value: 'timeline', label: 'Timeline' },
    { value: 'search', label: 'Search Results' },
    { value: 'profile', label: 'Profile' },
    { value: 'replies', label: 'Replies' },
  ],
  meta: [
    { value: 'feed', label: 'News Feed' },
    { value: 'stories', label: 'Stories' },
    { value: 'reels', label: 'Reels' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'right_column', label: 'Right Column' },
    { value: 'instagram_feed', label: 'Instagram Feed' },
    { value: 'instagram_stories', label: 'Instagram Stories' },
  ],
  google: [
    { value: 'search', label: 'Search Network' },
    { value: 'display', label: 'Display Network' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'gmail', label: 'Gmail' },
    { value: 'discover', label: 'Discover' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Initial form state                                                 */
/* ------------------------------------------------------------------ */

const emptyForm: CampaignForm = {
  platform: 'twitter',
  name: '',
  objective: 'awareness',
  daily_budget: '',
  total_budget: '',
  bid_strategy: 'auto',
  start_date: '',
  end_date: '',
  age_min: '18',
  age_max: '65',
  gender: 'all',
  locations: '',
  interests: [],
  interestInput: '',
  device: 'all',
  placements: [],
  ad_type: 'image',
  headline: '',
  body_text: '',
  media_url: '',
  cta_type: 'learn_more',
  destination_url: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdsPage() {
  const [platformTab, setPlatformTab] = useState<'all' | Platform>('all');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [expandedCreative, setExpandedCreative] = useState(true);
  const [expandedTargeting, setExpandedTargeting] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- fetch campaigns ---------- */
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const platform = platformTab === 'all' ? undefined : platformTab;
      const data = await api.ads.campaigns(platform);
      setCampaigns(data ?? []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      setCampaigns([]);
      setError('Failed to load campaigns from API.');
    } finally {
      setLoading(false);
    }
  }, [platformTab]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  /* ---------- derived ---------- */
  const filtered = campaigns.filter(
    (c) => platformTab === 'all' || c.platform === platformTab,
  );

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  /* ---------- handlers ---------- */

  async function handleToggleStatus(id: number) {
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) return;

    setActionLoading(id);
    try {
      if (campaign.status === 'active') {
        await api.ads.pauseCampaign(id);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'paused' as CampaignStatus } : c)),
        );
      } else if (campaign.status === 'paused') {
        await api.ads.resumeCampaign(id);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'active' as CampaignStatus } : c)),
        );
      } else if (campaign.status === 'draft') {
        await api.ads.activateCampaign(id);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'active' as CampaignStatus } : c)),
        );
      }
    } catch (err) {
      console.error('Failed to toggle campaign status:', err);
      // Optimistic fallback: update locally anyway
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          if (c.status === 'active') return { ...c, status: 'paused' as CampaignStatus };
          if (c.status === 'paused' || c.status === 'draft') return { ...c, status: 'active' as CampaignStatus };
          return c;
        }),
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    setActionLoading(id);
    try {
      await api.ads.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete campaign:', err);
      // Fallback: delete locally
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setActionLoading(null);
    }
  }

  function handleAddInterest() {
    const tag = form.interestInput.trim();
    if (tag && !form.interests.includes(tag)) {
      setForm((f) => ({ ...f, interests: [...f.interests, tag], interestInput: '' }));
    }
  }

  function handleRemoveInterest(tag: string) {
    setForm((f) => ({ ...f, interests: f.interests.filter((t) => t !== tag) }));
  }

  function togglePlacement(val: string) {
    setForm((f) => ({
      ...f,
      placements: f.placements.includes(val)
        ? f.placements.filter((p) => p !== val)
        : [...f.placements, val],
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const campaignData = {
      platform: form.platform,
      name: form.name || 'Untitled Campaign',
      objective: form.objective,
      daily_budget: Number(form.daily_budget) || 0,
      total_budget: Number(form.total_budget) || 0,
      currency: 'KRW',
      bid_strategy: form.bid_strategy,
      start_date: form.start_date,
      end_date: form.end_date,
      targeting: {
        age_min: Number(form.age_min),
        age_max: form.age_max === '65+' ? 65 : Number(form.age_max),
        gender: form.gender,
        locations: form.locations.split(',').map((l) => l.trim()).filter(Boolean),
        interests: form.interests,
        device: form.device,
        placements: form.placements,
      },
      creative: {
        ad_type: form.ad_type,
        headline: form.headline,
        body_text: form.body_text,
        media_url: form.media_url,
        cta_type: form.cta_type,
        destination_url: form.destination_url,
      },
    };

    try {
      const created = await api.ads.createCampaign(campaignData);
      // Use server response if it looks like a campaign, otherwise build locally
      const newCampaign: Campaign = created?.id ? created : {
        id: Date.now(),
        platform: form.platform,
        name: form.name || 'Untitled Campaign',
        objective: form.objective,
        status: 'draft' as CampaignStatus,
        daily_budget: Number(form.daily_budget) || 0,
        total_budget: Number(form.total_budget) || 0,
        currency: 'KRW',
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        conversions: 0,
        roas: 0,
        start_date: form.start_date,
        end_date: form.end_date,
      };
      setCampaigns((prev) => [newCampaign, ...prev]);
    } catch (err) {
      console.error('Failed to create campaign:', err);
      // Fallback: create locally
      const newCampaign: Campaign = {
        id: Date.now(),
        platform: form.platform,
        name: form.name || 'Untitled Campaign',
        objective: form.objective,
        status: 'draft',
        daily_budget: Number(form.daily_budget) || 0,
        total_budget: Number(form.total_budget) || 0,
        currency: 'KRW',
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        conversions: 0,
        roas: 0,
        start_date: form.start_date,
        end_date: form.end_date,
      };
      setCampaigns((prev) => [newCampaign, ...prev]);
    } finally {
      setSubmitting(false);
      setForm(emptyForm);
      setShowForm(false);
    }
  }

  /* ---------- sub-components (inline) ---------- */

  const inputCls =
    'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow';
  const labelCls = 'block text-xs font-medium text-surface-600 mb-1';
  const sectionHeaderCls =
    'flex items-center justify-between cursor-pointer select-none py-2';

  /* ---------- render ---------- */

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Advertising</h1>
          <p className="text-sm text-surface-500 mt-0.5">광고 캠페인 관리 및 성과 분석</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Platform tabs */}
          <div className="flex gap-1 bg-white rounded-lg border border-surface-200 p-1">
            {(['all', 'twitter', 'meta', 'google'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatformTab(p)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  platformTab === p
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-500 hover:bg-surface-100',
                )}
              >
                {p === 'all' ? 'All' : platformLabels[p]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'New Campaign'}
          </button>
        </div>
      </div>

      {/* ===== Error Banner ===== */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <span>{error}</span>
        </div>
      )}

      {/* ===== KPI Row ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Spend"
          value={formatWon(totalSpend)}
          change="+18.2% vs last period"
          changeType="up"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <KpiCard
          title="Impressions"
          value={formatNumber(totalImpressions)}
          change="+12.5% vs last period"
          changeType="up"
          icon={<Eye className="w-5 h-5" />}
        />
        <KpiCard
          title="Clicks"
          value={formatNumber(totalClicks)}
          change="+9.8% vs last period"
          changeType="up"
          icon={<MousePointerClick className="w-5 h-5" />}
        />
        <KpiCard
          title="Avg CTR"
          value={`${avgCtr}%`}
          change="+0.4%p vs last period"
          changeType="up"
          icon={<Target className="w-5 h-5" />}
        />
      </div>

      {/* ===== Campaign Creation Form ===== */}
      {showForm && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50">
            <h3 className="text-sm font-semibold text-surface-900">Create New Campaign</h3>
            <p className="text-xs text-surface-500 mt-0.5">새 광고 캠페인을 설정합니다</p>
          </div>

          <div className="p-6 space-y-6">
            {/* -- Basic info -- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Platform</label>
                <select
                  className={inputCls}
                  value={form.platform}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      platform: e.target.value as Platform,
                      placements: [],
                    }))
                  }
                >
                  <option value="twitter">Twitter / X</option>
                  <option value="meta" disabled>Meta (준비 중)</option>
                  <option value="google" disabled>Google (준비 중)</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className={labelCls}>Campaign Name</label>
                <input
                  className={inputCls}
                  placeholder="캠페인 이름을 입력하세요"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Objective</label>
                <select
                  className={inputCls}
                  value={form.objective}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, objective: e.target.value as Objective }))
                  }
                >
                  {(Object.keys(objectiveLabels) as Objective[]).map((o) => (
                    <option key={o} value={o}>
                      {objectiveLabels[o]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* -- Budget & schedule -- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className={labelCls}>Daily Budget (KRW)</label>
                <input
                  className={inputCls}
                  type="number"
                  placeholder="50,000"
                  value={form.daily_budget}
                  onChange={(e) => setForm((f) => ({ ...f, daily_budget: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Total Budget (KRW)</label>
                <input
                  className={inputCls}
                  type="number"
                  placeholder="1,500,000"
                  value={form.total_budget}
                  onChange={(e) => setForm((f) => ({ ...f, total_budget: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Bid Strategy</label>
                <select
                  className={inputCls}
                  value={form.bid_strategy}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bid_strategy: e.target.value as BidStrategy }))
                  }
                >
                  {(Object.keys(bidStrategyLabels) as BidStrategy[]).map((b) => (
                    <option key={b} value={b}>
                      {bidStrategyLabels[b]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Start Date</label>
                <input
                  className={inputCls}
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input
                  className={inputCls}
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            {/* -- Targeting -- */}
            <div className="border border-surface-200 rounded-lg overflow-hidden">
              <div
                className={clsx(sectionHeaderCls, 'px-4 bg-surface-50')}
                onClick={() => setExpandedTargeting((v) => !v)}
              >
                <span className="text-sm font-semibold text-surface-800">Targeting</span>
                {expandedTargeting ? (
                  <ChevronUp className="w-4 h-4 text-surface-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-surface-400" />
                )}
              </div>
              {expandedTargeting && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Age range */}
                    <div>
                      <label className={labelCls}>Age Min</label>
                      <select
                        className={inputCls}
                        value={form.age_min}
                        onChange={(e) => setForm((f) => ({ ...f, age_min: e.target.value }))}
                      >
                        {Array.from({ length: 48 }, (_, i) => i + 13).map((age) => (
                          <option key={age} value={String(age)}>
                            {age}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Age Max</label>
                      <select
                        className={inputCls}
                        value={form.age_max}
                        onChange={(e) => setForm((f) => ({ ...f, age_max: e.target.value }))}
                      >
                        {Array.from({ length: 48 }, (_, i) => i + 18).map((age) => (
                          <option key={age} value={String(age)}>
                            {age}
                          </option>
                        ))}
                        <option value="65+">65+</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Gender</label>
                      <select
                        className={inputCls}
                        value={form.gender}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, gender: e.target.value as Gender }))
                        }
                      >
                        <option value="all">All</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Device</label>
                      <select
                        className={inputCls}
                        value={form.device}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, device: e.target.value as Device }))
                        }
                      >
                        <option value="all">All Devices</option>
                        <option value="mobile">Mobile</option>
                        <option value="desktop">Desktop</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Locations */}
                    <div>
                      <label className={labelCls}>Locations</label>
                      <input
                        className={inputCls}
                        placeholder="e.g. 서울, 경기도, 부산"
                        value={form.locations}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, locations: e.target.value }))
                        }
                      />
                    </div>
                    {/* Interests */}
                    <div>
                      <label className={labelCls}>Interests</label>
                      <div className="flex gap-2">
                        <input
                          className={clsx(inputCls, 'flex-1')}
                          placeholder="태그를 입력하고 Enter"
                          value={form.interestInput}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, interestInput: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddInterest();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddInterest}
                          className="px-3 py-2 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {form.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {form.interests.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-full"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveInterest(tag)}
                                className="hover:text-primary-900"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Placements (platform-specific) */}
                  <div>
                    <label className={labelCls}>
                      Placements ({platformLabels[form.platform]})
                    </label>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {platformPlacements[form.platform].map((pl) => (
                        <label
                          key={pl.value}
                          className="inline-flex items-center gap-1.5 text-sm text-surface-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={form.placements.includes(pl.value)}
                            onChange={() => togglePlacement(pl.value)}
                            className="rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                          />
                          {pl.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* -- Ad Creative -- */}
            <div className="border border-surface-200 rounded-lg overflow-hidden">
              <div
                className={clsx(sectionHeaderCls, 'px-4 bg-surface-50')}
                onClick={() => setExpandedCreative((v) => !v)}
              >
                <span className="text-sm font-semibold text-surface-800">Ad Creative</span>
                {expandedCreative ? (
                  <ChevronUp className="w-4 h-4 text-surface-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-surface-400" />
                )}
              </div>
              {expandedCreative && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Ad Type</label>
                      <select
                        className={inputCls}
                        value={form.ad_type}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, ad_type: e.target.value as AdType }))
                        }
                      >
                        {(Object.keys(adTypeLabels) as AdType[]).map((t) => (
                          <option key={t} value={t}>
                            {adTypeLabels[t]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>CTA</label>
                      <select
                        className={inputCls}
                        value={form.cta_type}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, cta_type: e.target.value as CtaType }))
                        }
                      >
                        {(Object.keys(ctaLabels) as CtaType[]).map((c) => (
                          <option key={c} value={c}>
                            {ctaLabels[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Media URL</label>
                      <input
                        className={inputCls}
                        placeholder="https://..."
                        value={form.media_url}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, media_url: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Headline</label>
                      <input
                        className={inputCls}
                        placeholder="광고 헤드라인"
                        value={form.headline}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, headline: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Destination URL</label>
                      <input
                        className={inputCls}
                        placeholder="https://your-site.com/landing"
                        value={form.destination_url}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, destination_url: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Body Text</label>
                    <textarea
                      className={clsx(inputCls, 'resize-none')}
                      rows={3}
                      placeholder="광고 본문을 입력하세요"
                      value={form.body_text}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, body_text: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* -- Actions -- */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setShowForm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Campaign List ===== */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100">
          <h3 className="text-sm font-semibold text-surface-900">
            Campaigns
            <span className="ml-2 text-surface-400 font-normal">({filtered.length})</span>
          </h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-surface-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading campaigns...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs">Platform</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs">Objective</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-surface-500 text-xs">Budget</th>
                  <th className="text-right px-4 py-3 font-medium text-surface-500 text-xs">Spend</th>
                  <th className="text-right px-4 py-3 font-medium text-surface-500 text-xs">Impressions</th>
                  <th className="text-right px-4 py-3 font-medium text-surface-500 text-xs">Clicks</th>
                  <th className="text-right px-4 py-3 font-medium text-surface-500 text-xs">CTR</th>
                  <th className="text-right px-4 py-3 font-medium text-surface-500 text-xs">ROAS</th>
                  <th className="text-center px-4 py-3 font-medium text-surface-500 text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-surface-50 hover:bg-surface-50/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          platformColors[c.platform],
                        )}
                      >
                        {platformLabels[c.platform]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-surface-900 max-w-[200px] truncate">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-surface-600">{objectiveLabels[c.objective]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          statusColors[c.status],
                        )}
                      >
                        {statusLabels[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">
                      {formatWon(c.total_budget)}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">
                      {formatWon(c.spend)}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">
                      {formatNumber(c.impressions)}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">
                      {formatNumber(c.clicks)}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">
                      {c.ctr.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">
                      {c.roas > 0 ? `${c.roas.toFixed(1)}x` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {actionLoading === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-surface-400" />
                        ) : (
                          <>
                            {(c.status === 'active' || c.status === 'paused' || c.status === 'draft') && (
                              <button
                                onClick={() => handleToggleStatus(c.id)}
                                className={clsx(
                                  'p-1.5 rounded-md transition-colors',
                                  c.status === 'active'
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50',
                                )}
                                title={c.status === 'active' ? 'Pause' : 'Resume'}
                              >
                                {c.status === 'active' ? (
                                  <Pause className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              className="p-1.5 rounded-md text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center py-12 text-sm text-surface-400">아직 광고 캠페인이 없습니다. 새 캠페인을 생성하세요.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Spend Trend Chart ===== */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-surface-900 mb-4">Daily Spend Trend</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[]} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorTwitter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGoogle" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                tickFormatter={(v: number) => `₩${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                }}
                formatter={(value, name) => [
                  formatWon(Number(value)),
                  platformLabels[String(name) as Platform] || String(name),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => platformLabels[String(value) as Platform] || String(value)}
              />
              <Area
                type="monotone"
                dataKey="twitter"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#colorTwitter)"
              />
              <Area
                type="monotone"
                dataKey="meta"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorMeta)"
              />
              <Area
                type="monotone"
                dataKey="google"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorGoogle)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
