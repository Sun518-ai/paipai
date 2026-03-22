'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface Animal {
  name: string;
  emoji: string;
  type: string;
  rarity: string;
  funFact: string;
  seenCount: number;
  isFavorite: boolean;
}

interface Card {
  id: number;
  emoji: string;
  name: string;
  pairId: number;
}

type HatchPhase = 'idle' | 'shaking' | 'cracking' | 'hatching' | 'done';

const SOUND_FLIP = 'https://www.soundjay.com/buttons/button-09a.mp3';
const SOUND_MATCH = 'https://www.soundjay.com/misc/sounds/bell-ringing-04.mp3';
const SOUND_HATCH = 'https://www.soundjay.com/human/applause-8.mp3';
const SOUND_MISS = 'https://www.soundjay.com/buttons/button-10.mp3';

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function playSound(url: string) {
  try {
    const audio = new Audio(url);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch {}
}

function StarBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const stars = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    delay: i * 0.05,
  }));
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute animate-star-burst text-2xl"
          style={{
            transform: `rotate(${s.angle}deg) translateY(-60px)`,
            animationDelay: `${s.delay}s`,
          }}
        >
          ⭐
        </div>
      ))}
    </div>
  );
}

function Confetti() {
  const items = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    color: ['🎉', '🎊', '✨', '🌟', '💫', '🎈'][i % 6],
    size: Math.random() > 0.5 ? 'text-xl' : 'text-3xl',
  }));
  return (
    <div className="absolute inset-0 flex flex-wrap justify-around pointer-events-none overflow-hidden z-30">
      {items.map((item) => (
        <div
          key={item.id}
          className={`absolute animate-confetti-drop ${item.size}`}
          style={{
            left: `${item.x}%`,
            animationDelay: `${item.delay}s`,
            top: '-50px',
          }}
        >
          {item.color}
        </div>
      ))}
    </div>
  );
}

function EggHatch({ phase, animal, onDone }: { phase: HatchPhase; animal: Animal | null; onDone: () => void }) {
  useEffect(() => {
    if (phase === 'hatching') {
      playSound(SOUND_HATCH);
    }
  }, [phase]);

  if (phase === 'idle' || !animal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <Confetti />
      <div className="flex flex-col items-center gap-6">
        {phase === 'shaking' && (
          <div className="text-8xl animate-egg-shake">🥚</div>
        )}
        {phase === 'cracking' && (
          <div className="text-8xl animate-egg-crack">🥚⚡</div>
        )}
        {phase === 'hatching' && (
          <div className="flex flex-col items-center animate-bounce-in">
            <div className="text-9xl animate-hatch-jump">{animal.emoji}</div>
            <div className="text-4xl font-bold text-yellow-600 mt-4 animate-hatch-name">
              🎉 孵化成功！
            </div>
            <div className="text-3xl text-gray-700 mt-2">{animal.name} 来啦！</div>
            <div className="text-xl text-gray-500 mt-1 text-center px-8 max-w-sm">{animal.funFact}</div>
            <button
              onClick={onDone}
              className="mt-6 bg-gradient-to-r from-pink-400 to-orange-400 text-white text-2xl font-bold px-10 py-4 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              收下 {{ animal: animal } as unknown as string} 🐾
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EggsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const [roundsWon, setRoundsWon] = useState(0);
  const [hatchPhase, setHatchPhase] = useState<HatchPhase>('idle');
  const [hatchedAnimal, setHatchedAnimal] = useState<Animal | null>(null);
  const [collection, setCollection] = useState<Animal[]>([]);
  const [showCollection, setShowCollection] = useState(false);
  const [starBurst, setStarBurst] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [roundsWonDisplay, setRoundsWonDisplay] = useState(0);
  const processingRef = useRef(false);

  // Load collection from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('paipai_eggs_collection');
      if (saved) setCollection(JSON.parse(saved));
      const savedRounds = localStorage.getItem('paipai_eggs_rounds');
      if (savedRounds) setRoundsWonDisplay(parseInt(savedRounds));
    } catch {}
  }, []);

  // Fetch animals from API
  useEffect(() => {
    fetch('/api/eggs')
      .then((r) => r.json())
      .then((data) => {
        if (data.animals?.length) {
          setAnimals(data.animals);
          buildDeck(data.animals);
        }
      })
      .catch(() => {});
  }, []);

  function buildDeck(animalList: Animal[]) {
    // Pick 6 random animals for the deck (2 copies each = 12 cards)
    const pool = shuffle(animalList).slice(0, 6);
    const deck: Card[] = [];
    pool.forEach((a, i) => {
      deck.push({ id: i * 2, emoji: a.emoji, name: a.name, pairId: i });
      deck.push({ id: i * 2 + 1, emoji: a.emoji, name: a.name, pairId: i });
    });
    setCards(shuffle(deck));
    setGameStarted(true);
  }

  function startNewGame() {
    setFlipped([]);
    setMatched(new Set());
    setLocked(false);
    setRoundsWon(0);
    setStarBurst(null);
    setHatchPhase('idle');
    setHatchedAnimal(null);
    processingRef.current = false;
    if (animals.length) buildDeck(animals);
  }

  const handleCardClick = useCallback((idx: number) => {
    if (locked) return;
    if (matched.has(idx)) return;
    if (flipped.includes(idx)) return;
    if (flipped.length >= 2) return;

    playSound(SOUND_FLIP);
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setLocked(true);
      const [a, b] = newFlipped;
      const cardA = cards[a];
      const cardB = cards[b];

      if (cardA.pairId === cardB.pairId) {
        // Match!
        setTimeout(() => {
          playSound(SOUND_MATCH);
          setStarBurst(a);
          setTimeout(() => setStarBurst(null), 800);
          setMatched((prev) => new Set([...prev, a, b]));
          const newRounds = roundsWon + 1;
          setRoundsWon(newRounds);
          setRoundsWonDisplay(newRounds);
          try {
            localStorage.setItem('paipai_eggs_rounds', String(newRounds));
          } catch {}
          setFlipped([]);
          setLocked(false);

          // Every 3 rounds → hatch!
          if (newRounds % 3 === 0 && newRounds > 0) {
            triggerHatch();
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          playSound(SOUND_MISS);
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    }
  }, [locked, flipped, matched, cards, roundsWon]);

  function triggerHatch() {
    processingRef.current = true;
    const candidate = shuffle([...animals]).find((a) => !collection.find((c) => c.name === a.name)) || shuffle(animals)[0];

    setHatchedAnimal(candidate);
    setHatchPhase('shaking');

    setTimeout(() => {
      setHatchPhase('cracking');
      setTimeout(() => {
        setHatchPhase('hatching');
      }, 800);
    }, 1200);
  }

  function finishHatch() {
    if (hatchedAnimal) {
      const exists = collection.find((c) => c.name === hatchedAnimal!.name);
      if (!exists) {
        const updated = [...collection, hatchedAnimal];
        setCollection(updated);
        try { localStorage.setItem('paipai_eggs_collection', JSON.stringify(updated)); } catch {}
      }
    }
    setHatchPhase('done');
    setTimeout(() => {
      setHatchPhase('idle');
      setHatchedAnimal(null);
      processingRef.current = false;
      startNewGame();
    }, 400);
  }

  const totalMatched = matched.size;
  const allMatched = totalMatched === cards.length && cards.length > 0;

  const RARITY_COLOR: Record<string, string> = {
    common: 'from-gray-300 to-gray-400',
    uncommon: 'from-green-300 to-green-400',
    rare: 'from-blue-300 to-blue-500',
    legendary: 'from-yellow-400 via-orange-400 to-red-400',
  };

  return (
    <>
      <style>{`
        @keyframes egg-shake {
          0%,100% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(-15deg) scale(1.05); }
          30% { transform: rotate(15deg) scale(1.05); }
          45% { transform: rotate(-12deg) scale(1.05); }
          60% { transform: rotate(12deg) scale(1.05); }
          75% { transform: rotate(-8deg) scale(1.05); }
          90% { transform: rotate(8deg) scale(1.05); }
        }
        @keyframes egg-crack {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.1); filter: brightness(1.5) saturate(0.5); }
          100% { transform: scale(0.9); filter: brightness(2); }
        }
        @keyframes hatch-jump {
          0% { transform: scale(0) rotate(-20deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(10deg); opacity: 1; }
          75% { transform: scale(0.9) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes hatch-name {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes star-burst {
          0% { transform: rotate(var(--angle)) translateY(-20px) scale(0); opacity: 1; }
          50% { transform: rotate(var(--angle)) translateY(-70px) scale(1.5); opacity: 1; }
          100% { transform: rotate(var(--angle)) translateY(-120px) scale(0); opacity: 0; }
        }
        @keyframes confetti-drop {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-egg-shake { animation: egg-shake 0.8s ease-in-out infinite; }
        .animate-egg-crack { animation: egg-crack 0.8s ease-in-out forwards; }
        .animate-hatch-jump { animation: hatch-jump 0.6s ease-out forwards; }
        .animate-hatch-name { animation: hatch-name 0.5s ease-out 0.3s both; }
        .animate-bounce-in { animation: bounce-in 0.5s ease-out both; }
        .animate-star-burst {
          animation: star-burst 0.8s ease-out both;
          transform-origin: center;
        }
        .animate-confetti-drop {
          animation: confetti-drop 2s ease-in both;
        }
      `}</style>

      <EggHatch phase={hatchPhase} animal={hatchedAnimal} onDone={finishHatch} />

      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-orange-100 to-yellow-100 pb-20">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-sm border-b border-white/30 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-3xl hover:scale-110 transition-transform">🏠</Link>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-orange-600">🥚 彩蛋对对碰</h1>
              <div className="flex items-center justify-center gap-4 mt-1">
                <span className="text-lg font-bold text-gray-600">
                  🥚 已完成 {roundsWonDisplay} 轮
                </span>
                <span className="text-lg font-bold text-purple-600">
                  🐾 收集 {collection.length} 个
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowCollection(true)}
              className="text-3xl hover:scale-110 transition-transform"
            >
              📖
            </button>
          </div>

          {/* Progress: 3 rounds to hatch */}
          {gameStarted && (
            <div className="max-w-3xl mx-auto px-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-500 font-medium">孵化进度</span>
                <span className="text-xs text-orange-400">每3轮孵一个蛋！</span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 h-4 rounded-full transition-all ${
                      roundsWon % 3 > i
                        ? 'bg-gradient-to-r from-pink-400 to-orange-400'
                        : roundsWon % 3 === i + 1 || (roundsWon % 3 === 0 && roundsWon > 0 && i === 2)
                        ? 'bg-orange-300 animate-pulse'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              {roundsWon > 0 && roundsWon % 3 === 0 && (
                <div className="text-center text-orange-500 text-sm font-bold mt-1 animate-pulse">
                  🥚🥚🥚 准备孵化！
                </div>
              )}
            </div>
          )}
        </div>

        {/* Game area */}
        <div className="max-w-3xl mx-auto px-4 pt-6">
          {!gameStarted ? (
            <div className="flex flex-col items-center justify-center py-20 gap-8">
              <div className="text-8xl animate-bounce">🥚</div>
              <h2 className="text-3xl font-bold text-orange-600 text-center">
                派派的小动物园
              </h2>
              <p className="text-xl text-gray-500 text-center max-w-xs">
                翻翻彩蛋，找相同！<br />每完成3轮就能孵化小动物！
              </p>
              <button
                onClick={() => animals.length && buildDeck(animals)}
                disabled={!animals.length}
                className="bg-gradient-to-r from-pink-400 to-orange-400 text-white text-2xl font-bold px-12 py-5 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
              >
                开始游戏 🎮
              </button>
            </div>
          ) : allMatched && totalMatched > 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <div className="text-7xl">🎉🏆🎉</div>
              <h2 className="text-4xl font-bold text-orange-500">太棒啦！</h2>
              <p className="text-2xl text-gray-600">全部配对成功！</p>
              <button
                onClick={startNewGame}
                className="bg-gradient-to-r from-pink-400 to-orange-400 text-white text-2xl font-bold px-10 py-4 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform"
              >
                再来一局 🔄
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 md:grid-cols-4">
              {cards.map((card, idx) => {
                const isFlipped = flipped.includes(idx) || matched.has(idx);
                const isMatched = matched.has(idx);
                return (
                  <div key={card.id} className="relative">
                    <button
                      onClick={() => handleCardClick(idx)}
                      className={`
                        w-full aspect-square rounded-2xl flex flex-col items-center justify-center
                        transition-all duration-300 shadow-lg
                        ${isFlipped
                          ? isMatched
                            ? 'bg-gradient-to-br from-green-200 to-green-300 scale-95 shadow-sm'
                            : 'bg-gradient-to-br from-pink-100 to-orange-100 rotate-0'
                          : 'bg-gradient-to-br from-pink-300 via-orange-200 to-yellow-200 hover:scale-105 active:scale-95'
                        }
                        ${matched.has(idx) ? 'ring-4 ring-yellow-400 ring-opacity-60' : ''}
                      `}
                      disabled={isFlipped || locked}
                    >
                      {isFlipped ? (
                        <span className="text-4xl md:text-5xl">{card.emoji}</span>
                      ) : (
                        <span className="text-3xl md:text-4xl">❓</span>
                      )}
                      {isMatched && (
                        <span className="absolute -top-2 -right-2 text-xl">✨</span>
                      )}
                    </button>
                    <StarBurst active={starBurst === idx} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Hint button */}
          {gameStarted && !allMatched && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-lg text-orange-400 font-bold bg-white/60 px-6 py-2 rounded-full hover:bg-white/80 transition-colors"
              >
                {showHint ? '收起提示' : '🔔 提示一下？'}
              </button>
            </div>
          )}

          {gameStarted && !allMatched && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={startNewGame}
                className="text-lg text-gray-400 bg-white/40 px-5 py-2 rounded-full hover:bg-white/60 transition-colors"
              >
                重新开始 🔄
              </button>
            </div>
          )}
        </div>

        {/* Collection panel */}
        {showCollection && (
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-orange-500">
                  📖 派派的小动物园 ({collection.length})
                </h2>
                <button
                  onClick={() => setShowCollection(false)}
                  className="text-3xl hover:scale-110 transition-transform"
                >
                  ✕
                </button>
              </div>
              {collection.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🥚</div>
                  <p className="text-xl text-gray-500">还没孵化到小动物</p>
                  <p className="text-lg text-gray-400">完成3轮配对就能孵蛋啦！</p>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 gap-3">
                  {collection.map((animal) => (
                    <div
                      key={animal.name}
                      className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${RARITY_COLOR[animal.rarity] || 'from-gray-200 to-gray-300'}`}
                    >
                      <span className="text-5xl">{animal.emoji}</span>
                      <div className="flex-1">
                        <div className="text-xl font-bold text-white drop-shadow-sm">{animal.name}</div>
                        <div className="text-sm text-white/80">{animal.funFact}</div>
                      </div>
                      <SeenBadge name={animal.name} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SeenBadge({ name }: { name: string }) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`paipai_seen_${name}`);
      if (saved) setSeen(true);
    } catch {}
  }, [name]);

  function toggleSeen() {
    const next = !seen;
    setSeen(next);
    try { localStorage.setItem(`paipai_seen_${name}`, next ? '1' : ''); } catch {}
  }

  return (
    <button
      onClick={toggleSeen}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95 ${
        seen ? 'bg-green-400 text-white' : 'bg-white/60 text-gray-500'
      }`}
    >
      <span className="text-xl">{seen ? '✅' : '👀'}</span>
      <span>{seen ? '见过啦' : '见过？'}</span>
    </button>
  );
}
