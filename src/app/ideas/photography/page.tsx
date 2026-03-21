'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { loadHybrid, saveHybrid } from '@/lib/feishuStore';

interface Photo {
  id: string;
  src: string;
  caption: string;
  date: string;
}

const DEFAULT_PHOTOS: Photo[] = [
  {
    id: '1',
    src: '/gallery/01-mom-paipai.jpg',
    caption: '妈妈和派派的美好时光 💕',
    date: '2026-03-21',
  },
];

export default function PhotographyPage() {
  const [photos, setPhotos] = useState<Photo[]>(DEFAULT_PHOTOS);

  useEffect(() => {
    loadHybrid<Photo[]>('paipai-photos', DEFAULT_PHOTOS).then((data) => {
      if (data.length > 0) setPhotos(data);
    });
  }, []);
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Loaded via lazy init


  const savePhotos = useCallback((newPhotos: Photo[]) => {
    saveHybrid('paipai-photos', newPhotos);
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? photos.length - 1 : c - 1));
  }, [photos.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c === photos.length - 1 ? 0 : c + 1));
  }, [photos.length]);

  // Auto-play
  useEffect(() => {
    if (isPlaying && photos.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrent((c) => (c === photos.length - 1 ? 0 : c + 1));
      }, 4000);
    } else {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === ' ') setIsPlaying((p) => !p);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prev, next]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      setUploading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const id = Date.now().toString();
        const newPhoto: Photo = {
          id,
          src: dataUrl,
          caption: caption.trim() || `美好时光 ${photos.length + 1}`,
          date: new Date().toISOString().split('T')[0],
        };

        // Save to localStorage and also save as file in public gallery
        const newPhotos = [...photos, newPhoto];
        setPhotos(newPhotos);
        savePhotos(newPhotos);

        // Save the base64 image as a file
        // Image saved as dataUrl in memory

        setCaption('');
        setShowUpload(false);
        setUploading(false);
        setCurrent(newPhotos.length - 1);
      };
      reader.readAsDataURL(file);
    },
    [caption, photos, savePhotos]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const deletePhoto = (id: string) => {
    const newPhotos = photos.filter((p) => p.id !== id);
    setPhotos(newPhotos);
    savePhotos(newPhotos);
    if (current >= newPhotos.length) setCurrent(Math.max(0, newPhotos.length - 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50">
      {/* Back */}
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-600 text-sm font-medium transition-colors"
        >
          ← 返回点子站
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-2">📷</span>
          <h1 className="text-3xl font-bold text-gray-800">美好时光相册</h1>
          <p className="text-gray-400 mt-1">妈妈和派派的温馨时刻 💕</p>
        </div>

        {/* Carousel */}
        {photos.length > 0 ? (
          <div className="relative">
            {/* Main image */}
            <div
              className="relative rounded-3xl overflow-hidden shadow-xl bg-gray-100 aspect-[4/3] select-none"
              onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchStart === null) return;
                const diff = touchStart - e.changedTouches[0].clientX;
                if (diff > 60) next();
                else if (diff < -60) prev();
                setTouchStart(null);
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={photos[current]?.id}
                src={photos[current]?.src}
                alt={photos[current]?.caption}
                className="w-full h-full object-contain bg-gray-900"
              />

              {/* Drop overlay */}
              {dragOver && (
                <div className="absolute inset-0 bg-rose-400/80 flex items-center justify-center">
                  <p className="text-white text-xl font-bold">松开上传 📸</p>
                </div>
              )}

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 pb-4">
                <p className="text-white text-lg font-medium">
                  {photos[current]?.caption}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {current + 1} / {photos.length} · {photos[current]?.date}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={() => deletePhoto(photos[current].id)}
                className="absolute top-3 right-3 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center text-sm transition-colors"
                title="删除照片"
              >
                🗑️
              </button>
            </div>

            {/* Prev / Next */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 transition-all hover:scale-110"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 transition-all hover:scale-110"
                >
                  ›
                </button>
              </>
            )}

            {/* Dots */}
            {photos.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === current ? 'bg-rose-400 w-6' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center py-24 text-gray-300">
            <span className="text-6xl mb-4">📷</span>
            <p className="text-lg font-medium">还没有照片</p>
            <p className="text-sm mt-1">上传第一张美好时光吧</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {/* Auto-play */}
          {photos.length > 1 && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                isPlaying
                  ? 'bg-rose-500 text-white shadow'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-rose-50'
              }`}
            >
              {isPlaying ? '⏸ 暂停' : '▶ 播放'}
            </button>
          )}

          {/* Upload */}
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-all flex items-center gap-2"
          >
            📤 {showUpload ? '取消' : '上传照片'}
          </button>
        </div>

        {/* Upload panel */}
        {showUpload && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3">上传新照片 📸</h3>

            {/* Caption */}
            <input
              type="text"
              placeholder="给照片写个说明..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if(f) handleFile(f); }}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-rose-400 bg-rose-50'
                  : 'border-gray-200 hover:border-rose-300 hover:bg-rose-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <span className="text-4xl mb-3">{uploading ? '⏳' : '📷'}</span>
              <p className="text-gray-600 font-medium">
                {uploading ? '上传中...' : '点击上传或拖拽照片到这里'}
              </p>
              <p className="text-gray-400 text-sm mt-1">支持 JPG, PNG, GIF 等格式</p>
            </div>
          </div>
        )}

        {/* Photo grid */}
        {photos.length > 1 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-700 mb-4">所有照片 ({photos.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setCurrent(i)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    i === current ? 'border-rose-400 ring-2 ring-rose-200' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt={photo.caption}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1">
                    <p className="text-white text-xs truncate">{photo.caption}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-gray-300 text-xs mt-8">
          💡 提示：左右滑动或使用方向键切换照片，按空格键自动播放
        </p>
      </div>
    </div>
  );
}
