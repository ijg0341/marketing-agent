import { useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { api } from '../api';

interface Asset {
  id: number;
  url: string;
  description: string;
  tags: string | null;
  used_count: number;
  last_used_at: string | null;
  created_at: string;
}

const ACCEPT_TYPES = 'image/png,image/jpeg,image/jpg,image/gif,image/webp';
const MAX_BYTES = 10 * 1024 * 1024;

function formatRelative(iso: string | null): string {
  if (!iso) return '아직 사용 안 함';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);

  // upload state (new)
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // shared form state
  const [formDesc, setFormDesc] = useState('');
  const [formTags, setFormTags] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.assets.list();
      setAssets(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? '자산 목록을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // revoke object URL when file changes/cleared
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const resetForm = () => {
    setEditingId(null);
    setEditingUrl(null);
    setFile(null);
    setFormDesc('');
    setFormTags('');
    setShowForm(false);
    setError(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (a: Asset) => {
    setEditingId(a.id);
    setEditingUrl(a.url);
    setFile(null);
    setFormDesc(a.description);
    setFormTags(a.tags ?? '');
    setShowForm(true);
    setError(null);
  };

  const validateFile = (f: File): string | null => {
    if (!ACCEPT_TYPES.split(',').includes(f.type)) {
      return `지원하지 않는 형식입니다: ${f.type || '(unknown)'} (PNG/JPG/GIF/WebP만 가능)`;
    }
    if (f.size > MAX_BYTES) {
      return `파일이 너무 큽니다 (${formatSize(f.size)}) — 최대 10MB`;
    }
    return null;
  };

  const handleFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSave = async () => {
    if (!formDesc.trim()) {
      setError('설명은 필수입니다');
      return;
    }
    if (editingId == null && !file) {
      setError('이미지를 선택하세요');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId != null) {
        await api.assets.update(editingId, {
          description: formDesc.trim(),
          tags: formTags.trim() || undefined,
        });
      } else if (file) {
        await api.assets.upload(file, formDesc.trim(), formTags.trim() || undefined);
      }
      resetForm();
      await refresh();
    } catch (e: any) {
      setError(e.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('이 자산을 삭제하시겠습니까?')) return;
    try {
      await api.assets.delete(id);
      await refresh();
    } catch (e: any) {
      setError(e.message ?? '삭제 실패');
    }
  };

  const dropDisplayUrl = previewUrl ?? editingUrl;

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-[24px] font-bold text-surface-50 tracking-tight leading-none">이미지 자산</h1>
          <p className="text-[14px] text-surface-200 mt-2">
            이미지를 업로드해 두면, 콘텐츠 자동 생성 시 AI가 적절히 골라 콘텐츠에 끼워 넣습니다.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            새 자산
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 flex items-start gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mt-8 pb-8 border-b border-surface-800">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-surface-400">
              {editingId != null ? '자산 수정' : '새 자산 업로드'}
            </div>
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-1 px-2 py-1 text-[13px] text-surface-300 hover:text-surface-50 hover:bg-surface-800 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" /> 취소
            </button>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* Dropzone (only in create mode) */}
            {editingId == null && (
              <div>
                <label className="block text-[12.5px] font-medium text-surface-200 mb-1.5">이미지 파일</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-colors overflow-hidden ${
                    dragOver
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-surface-700 hover:border-surface-600 bg-surface-900'
                  }`}
                >
                  {dropDisplayUrl ? (
                    <div className="flex">
                      <div className="aspect-video w-1/2 bg-surface-950 flex items-center justify-center overflow-hidden">
                        <img src={dropDisplayUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 p-4 flex flex-col justify-center">
                        <p className="text-[14px] text-surface-50 font-medium break-all">
                          {file?.name ?? '선택된 파일'}
                        </p>
                        {file && (
                          <p className="text-[12.5px] text-surface-300 mt-1 tabular-nums">
                            {formatSize(file.size)} · {file.type}
                          </p>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); }}
                          className="mt-3 inline-flex items-center gap-1 px-2 py-1 text-[12.5px] text-surface-300 hover:text-red-400 hover:bg-red-500/10 rounded-md self-start transition-colors"
                        >
                          <X className="w-3 h-3" /> 제거
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <Upload className="w-7 h-7 text-surface-400 mb-3" />
                      <p className="text-[14px] text-surface-100 font-medium">
                        클릭해서 파일 선택 또는 여기로 드래그
                      </p>
                      <p className="text-[12.5px] text-surface-400 mt-1">
                        PNG · JPG · GIF · WebP · 최대 10MB
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_TYPES}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Editing — show current image read-only */}
            {editingId != null && editingUrl && (
              <div>
                <label className="block text-[12.5px] font-medium text-surface-200 mb-1.5">이미지</label>
                <div className="rounded-lg border border-surface-800 bg-surface-900 overflow-hidden flex">
                  <div className="aspect-video w-1/3 bg-surface-950 flex items-center justify-center overflow-hidden">
                    <img src={editingUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-center">
                    <p className="text-[12.5px] text-surface-400">
                      이미지 자체를 바꾸려면 이 자산을 삭제하고 새로 업로드하세요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[12.5px] font-medium text-surface-200 mb-1.5">설명</label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="이미지 내용·분위기·용도를 AI가 참고할 수 있게 한 줄로 설명"
                rows={2}
                className="w-full text-[14px] bg-surface-900 border border-surface-800 rounded-md px-3 py-2 focus:border-surface-600 focus:outline-none transition-colors placeholder:text-surface-500 resize-y leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-surface-200 mb-1.5">
                태그 <span className="text-surface-400 font-normal">(쉼표 구분, 선택)</span>
              </label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="screen-design, planning, mockup"
                className="w-full text-[14px] bg-surface-900 border border-surface-800 rounded-md px-3 py-2 focus:border-surface-600 focus:outline-none transition-colors placeholder:text-surface-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !formDesc.trim() || (editingId == null && !file)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:bg-surface-700 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingId != null ? '저장' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="mt-8">
        <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-surface-400 mb-4">
          등록된 자산 <span className="text-surface-300 normal-case tracking-normal ml-1">{assets.length}개</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
          </div>
        ) : assets.length === 0 ? (
          <div className="py-16 text-center">
            <ImageIcon className="w-8 h-8 text-surface-600 mx-auto mb-3" />
            <p className="text-[14px] text-surface-300">아직 등록된 자산이 없습니다.</p>
            <p className="text-[13px] text-surface-400 mt-1">이미지를 업로드해 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {assets.map((a) => (
              <div
                key={a.id}
                className="bg-surface-900 border border-surface-800 rounded-lg overflow-hidden flex flex-col"
              >
                <div className="aspect-video bg-surface-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={a.url}
                    alt={a.description}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const sibling = target.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden text-xs text-surface-400 items-center justify-center w-full h-full">
                    이미지 로드 실패
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-[14px] text-surface-50 leading-snug break-words line-clamp-3">
                    {a.description}
                  </p>

                  {a.tags && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {a.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                        <span
                          key={t}
                          className="inline-block px-2 py-0.5 text-[11.5px] text-surface-200 bg-surface-800 rounded-md"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-surface-800 flex items-center justify-between text-[12.5px] text-surface-400">
                    <span className="tabular-nums">사용 {a.used_count}회</span>
                    <span>{formatRelative(a.last_used_at)}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-1">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[12.5px] font-medium text-surface-300 hover:text-surface-50 hover:bg-surface-800 rounded-md transition-colors font-mono truncate max-w-[140px]"
                      title={a.url}
                    >
                      열기
                    </a>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 text-surface-300 hover:text-surface-50 hover:bg-surface-800 rounded-md transition-colors"
                        title="설명·태그 수정"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-surface-300 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
