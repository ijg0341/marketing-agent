import { clsx } from 'clsx';

const channelColors: Record<string, string> = {
  twitter: 'bg-sky-100 text-sky-700',
  instagram: 'bg-pink-100 text-pink-700',
  facebook: 'bg-blue-100 text-blue-700',
  blog: 'bg-emerald-100 text-emerald-700',
  email: 'bg-amber-100 text-amber-700',
};

const channelLabels: Record<string, string> = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  facebook: 'Facebook',
  blog: 'Blog',
  email: 'Email',
};

export function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        channelColors[channel] || 'bg-gray-100 text-gray-700'
      )}
    >
      {channelLabels[channel] || channel}
    </span>
  );
}
