'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sound } from '@/app/api/sounds/route';

const TOTAL_ROUNDS = 10;

const CATEGORY_TABS = [
  { key: 'all', label: '🎉 全部', color: 'from-pink-400 to-purple-500' },
  { key: 'vehicle', label: '🚗 车车', color: 'from-blue-400 to-indigo-500' },
  { key: 'animal', label: '🐾 动物', color: 'from-green-400 to-emerald-500' },
  { key: 'nature', label: '🌈 大自然', color: 'from-yellow-400 to-orange-500' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Confetti() {
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#54a0ff', '#5f27cd'];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 0.8 + Math.random() * 0.6,
    size: 8 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function StarsAnimation({ score }: { score: number }) {
  const starCount = Math.ceil((score / TOTAL_ROUNDS) * 3);
  const stars = Array.from({ length: 3 }, (_, i) => ({
    id: i,
    filled: i < starCount,
    delay: i * 0.3,
  }));

  return (
    <div className="flex gap-4 justify-center mb-6">
      {stars.map((s) => (
        <div
          key={s.id}
          className="text-7xl"
          style={{
            animation: `starPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${s.delay}s both`,
          }}
        >
          {s.filled ? '⭐' : '☆'}
        </div>
      ))}
      <style>{`
        @keyframes starPop {
          0% { transform: scale(0) rotate(-30deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function AnimalParade() {
  const animals = ['🐶', '🐱', '🐸', '🐷', '🐔', '🐰', '🦆', '🐻', '🐼', '🐨'];
  const moving = shuffle(animals).slice(0, 5);
  return (
    <div className="flex gap-6 justify-center mt-6">
      {moving.map((a, i) => (
        <div
          key={i}
          className="text-5xl"
          style={{
            animation: `paradeBounce 1s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        >
          {a}
        </div>
      ))}
      <style>{`
        @keyframes paradeBounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-16px); }
        }
      `}</style>
    </div>
  );
}

function EndScreen({ score, onRestart }: { score: number; onRestart: () => void }) {
  const messages = [
    '🎉 太厉害啦！全答对啦！你是最棒的小天才！',
    '🌟 太棒啦！答对了好多！派派真厉害！',
    '👏 很不错哦！继续加油，下次一定更好！',
    '😊 加油加油！多听几遍就记住了！',
  ];
  const pct = score / TOTAL_ROUNDS;
  const msgIdx = pct >= 1 ? 0 : pct >= 0.7 ? 1 : pct >= 0.4 ? 2 : 3;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white rounded-3xl shadow-2xl px-10 py-12 text-center max-w-sm w-full">
        <div className="text-2xl font-bold text-gray-800 mb-4">
          第 {score} / {TOTAL_ROUNDS} 题
        </div>
        <StarsAnimation score={score} />
        <p className="text-xl text-gray-700 mb-8 leading-relaxed">{messages[msgIdx]}</p>
        <AnimalParade />
        <button
          onClick={onRestart}
          className="mt-8 w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xl font-bold py-4 px-8 rounded-2xl shadow-lg active:scale-95 transition-transform"
        >
          🎮 再玩一次！
        </button>
      </div>
    </div>
  );
}

export default function SoundsPage() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [currentSound, setCurrentSound] = useState<Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioSrc, setAudioSrc] = useState<string>('');

  // Web Audio API fallback
  const playFallbackSound = useCallback((soundId: string) => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const patterns: Record<string, { freq: number[]; durations: number[] }> = {
        fire_truck: { freq: [800, 600], durations: [0.3, 0.3] },
        ambulance: { freq: [700, 900], durations: [0.25, 0.25] },
        car_horn: { freq: [440], durations: [0.4] },
        dump_truck: { freq: [330], durations: [0.5] },
        tractor: { freq: [150, 180, 150], durations: [0.3, 0.3, 0.3] },
        dog: { freq: [600, 400], durations: [0.15, 0.2] },
        cat: { freq: [800, 500], durations: [0.2, 0.3] },
        chicken: { freq: [1200, 1000, 800], durations: [0.1, 0.1, 0.15] },
        frog: { freq: [300, 200], durations: [0.2, 0.3] },
        pig: { freq: [250, 200, 250], durations: [0.2, 0.15, 0.2] },
        thunder: { freq: [80, 60, 80], durations: [0.4, 0.3, 0.5] },
        rain: { freq: [200, 180, 200], durations: [0.1, 0.1, 0.1] },
        bell: { freq: [1000], durations: [0.8] },
        music_box: { freq: [523, 659, 784, 659, 523], durations: [0.3, 0.3, 0.3, 0.3, 0.4] },
        trumpet: { freq: [523, 659, 784], durations: [0.3, 0.3, 0.5] },
      };

      const pattern = patterns[soundId] || { freq: [440], durations: [0.3] };
      let startTime = ctx.currentTime;

      pattern.freq.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, startTime);
        startTime += pattern.durations[i];
      });

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime);

      oscillator.start(ctx.currentTime);
      oscillator.stop(startTime);
    } catch {
      // Silently fail if Web Audio not available
    }
  }, []);

  useEffect(() => {
    fetch('/api/sounds')
      .then((r) => r.json())
      .then((d) => {
        setSounds(d.sounds || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const saved = localStorage.getItem('paipai-sounds-best');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  const getFilteredSounds = useCallback(() => {
    if (category === 'all') return sounds;
    return sounds.filter((s) => s.category === category);
  }, [sounds, category]);

  const startNewRound = useCallback(() => {
    const pool = getFilteredSounds();
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const shuffledOptions = shuffle(pick.options);
    setCurrentSound({ ...pick, options: shuffledOptions });
    setSelected(null);
    setCorrect(false);
    setPlaying(false);
  }, [getFilteredSounds]);

  useEffect(() => {
    if (sounds.length > 0 && !gameOver) {
      startNewRound();
    }
  }, [sounds, round, category, gameOver, startNewRound]);

  const handlePlay = useCallback(() => {
    if (!currentSound || playing) return;
    setPlaying(true);

    // Try external URL first
    const tryPlay = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const audio = new Audio();
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        setPlaying(false);
      });
      audio.addEventListener('error', () => {
        setPlaying(false);
        playFallbackSound(currentSound.id);
      });

      audio.src = currentSound.soundUrl;
      audio.crossOrigin = 'anonymous';
      audio.play().catch(() => {
        setPlaying(false);
        playFallbackSound(currentSound.id);
      });
    };

    tryPlay();

    // Fallback: auto-play synthesized sound after 1s if external fails
    const timer = setTimeout(() => {
      if (playing) {
        // already handled
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentSound, playing, playFallbackSound]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (selected !== null || !currentSound) return;
      setSelected(idx);
      const isCorrect = currentSound.options[idx].correct;

      if (isCorrect) {
        setCorrect(true);
        setScore((s) => s + 1);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
      }

      setTimeout(() => {
        if (round + 1 >= TOTAL_ROUNDS) {
          setGameOver(true);
          const newScore = isCorrect ? score + 1 : score;
          if (newScore > bestScore) {
            setBestScore(newScore);
            localStorage.setItem('paipai-sounds-best', String(newScore));
          }
        } else {
          setRound((r) => r + 1);
        }
      }, 1500);
    },
    [selected, currentSound, round, score, bestScore]
  );

  const handleRestart = useCallback(() => {
    setRound(0);
    setScore(0);
    setGameOver(false);
    setSelected(null);
    setCorrect(false);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const progressPct = (round / TOTAL_ROUNDS) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎵</div>
          <div className="text-2xl font-bold text-purple-600">加载中...</div>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-4">
            <div className="text-sm text-purple-500">🏆 最高纪录: {bestScore} 题</div>
          </div>
          <EndScreen score={correct ? score : score} onRestart={handleRestart} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      {showConfetti && <Confetti />}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-3">
          {/* Score + Progress */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <span className="text-xl font-bold text-purple-700">
                {score} 分
              </span>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-gray-700">
                第 {round + 1} / {TOTAL_ROUNDS} 题
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <span className="text-xl font-bold text-pink-700">
                {bestScore}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-400 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setCategory(tab.key);
                  setRound(0);
                  setScore(0);
                  setGameOver(false);
                  setSelected(null);
                  setCorrect(false);
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  category === tab.key
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-md scale-105`
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="container mx-auto px-4 py-6 flex flex-col items-center">
        {!currentSound ? (
          <div className="text-2xl text-gray-500 mt-20">没有声音可选～</div>
        ) : (
          <>
            {/* Speaker Card */}
            <div
              className={`relative mb-8 transition-transform ${playing ? 'animate-pulse' : ''}`}
            >
              {/* Pulsing Ring */}
              {playing && (
                <div className="absolute inset-0 rounded-full bg-purple-300 animate-ping opacity-30 scale-125" />
              )}
              {/* Card */}
              <div className="relative w-52 h-52 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex flex-col items-center justify-center shadow-2xl border-4 border-white">
                <div className="text-7xl mb-1">
                  {playing ? '🔊' : '🔈'}
                </div>
                <div className="text-white text-lg font-bold text-center px-4">
                  听一听！
                </div>
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={handlePlay}
              disabled={playing}
              className={`mb-8 text-2xl font-bold px-10 py-5 rounded-3xl shadow-xl transition-all active:scale-95 ${
                playing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-2xl hover:scale-105'
              }`}
            >
              {playing ? '🔊 播放中...' : '🔊 听一听！'}
            </button>

            {/* Question hint */}
            <div className="text-xl text-gray-600 font-bold mb-6 text-center">
              这是什么声音？
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              {currentSound.options.map((opt, idx) => {
                let btnClass = 'bg-white border-4 border-gray-200';
                if (selected !== null) {
                  if (idx === currentSound.options.findIndex((o) => o.correct)) {
                    btnClass = 'bg-green-100 border-4 border-green-400';
                  } else if (idx === selected) {
                    btnClass = 'bg-red-100 border-4 border-red-400 animate-shake';
                  } else {
                    btnClass = 'bg-gray-100 border-4 border-gray-200 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={selected !== null}
                    className={`${btnClass} rounded-2xl p-6 flex flex-col items-center gap-2 min-h-[100px] transition-all active:scale-95 shadow-md`}
                  >
                    <span className="text-5xl">{opt.emoji}</span>
                    <span className="text-lg font-bold text-gray-700">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {selected !== null && (
              <div className="mt-6 text-center animate-bounce">
                {correct ? (
                  <div className="text-2xl font-bold text-green-600">
                    🎉 太棒啦！答对啦！继续加油！
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-orange-600">
                    🤔 没关系哦！再听听看～
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
