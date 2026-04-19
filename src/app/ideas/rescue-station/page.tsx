'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  loadVehiclesFromCloud,
  saveVehicleToCloud,
  deleteVehicleFromCloud,
  Vehicle,
  VEHICLE_TYPES,
  PROBLEMS,
  TOOLS,
  TOOL_FOR_PROBLEM,
} from '@/lib/rescueStore';

// ================== Vehicle Visual Components ==================

function VehicleVisual({
  type,
  fixed,
  size = 'md',
  problem,
}: {
  type: string;
  fixed: boolean;
  size?: 'sm' | 'md' | 'lg';
  problem?: string;
}) {
  const vtype = VEHICLE_TYPES[type as keyof typeof VEHICLE_TYPES];
  const emoji = vtype?.emoji || '🚜';
  const sizeClass =
    size === 'sm' ? 'text-3xl' : size === 'lg' ? 'text-7xl' : 'text-5xl';
  const wobble = !fixed;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${sizeClass} ${wobble ? 'animate-pulse' : ''}`}
      title={vtype?.name || type}
    >
      {emoji}
      {!fixed && problem && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
          !
        </div>
      )}
      {fixed && (
        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
          ✓
        </div>
      )}
    </div>
  );
}

// ================== Broken Vehicle Card ==================

function BrokenVehicleCard({
  vehicle,
  onRescue,
}: {
  vehicle: Vehicle;
  onRescue: (v: Vehicle) => void;
}) {
  const vtype = VEHICLE_TYPES[vehicle.type as keyof typeof VEHICLE_TYPES];
  const damageColors = ['bg-yellow-100 border-yellow-300', 'bg-orange-100 border-orange-300', 'bg-red-100 border-red-300'];
  const damageColor = damageColors[Math.min((vehicle.damageLevel || 1) - 1, 2)];

  return (
    <div
      className={`relative rounded-2xl border-2 p-4 cursor-pointer hover:scale-105 transition-all duration-200 ${damageColor}`}
      onClick={() => onRescue(vehicle)}
    >
      <div className="flex flex-col items-center gap-2">
        <VehicleVisual type={vehicle.type} fixed={false} size="lg" problem={vehicle.problem} />
        <div className="text-center">
          <p className="font-black text-gray-800 text-sm">{vehicle.name}</p>
          <p className="text-xs text-gray-500">{vtype?.name || vehicle.type}</p>
          <div className="mt-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
            <p className="text-xs text-red-600 font-medium">⚠️ {vehicle.problem}</p>
          </div>
          {vehicle.damageLevel && vehicle.damageLevel > 1 && (
            <div className="flex justify-center gap-0.5 mt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-sm ${i < (vehicle.damageLevel || 1) ? '💥' : '⚪'}`}>
                  {i < (vehicle.damageLevel || 1) ? '💥' : '○'}
                </span>
              ))}
            </div>
          )}
        </div>
        <button className="mt-2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-bold transition-colors shadow">
          🚨 救援！
        </button>
      </div>
    </div>
  );
}

// ================== Workshop Area ==================

function Workshop({
  vehicle,
  onFixed,
}: {
  vehicle: Vehicle;
  onFixed: (v: Vehicle) => void;
}) {
  const problem = PROBLEMS.find((p) => p.name === vehicle.problem);
  const tool = problem ? TOOL_FOR_PROBLEM[problem.name] : null;
  const [progress, setProgress] = useState(0);
  const [tapping, setTapping] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const tapCount = useRef(0);
  const requiredTaps = (vehicle.damageLevel || 1) * 5;

  const handleTap = useCallback(() => {
    if (showSuccess) return;
    tapCount.current += 1;
    setTapping(true);
    setTimeout(() => setTapping(false), 100);
    setShowSparkle(true);
    setTimeout(() => setShowSparkle(false), 300);
    const pct = Math.min(100, Math.round((tapCount.current / requiredTaps) * 100));
    setProgress(pct);
    if (tapCount.current >= requiredTaps) {
      setTimeout(() => {
        setShowSuccess(true);
        setTimeout(() => {
          onFixed({ ...vehicle, fixed: true });
          tapCount.current = 0;
          setProgress(0);
          setShowSuccess(false);
        }, 1500);
      }, 200);
    }
  }, [showSuccess, requiredTaps, vehicle, onFixed]);

  return (
    <div className="bg-gradient-to-b from-blue-50 to-indigo-100 rounded-3xl border-2 border-blue-200 p-6">
      <div className="text-center mb-4">
        <span className="text-3xl">🔧</span>
        <h3 className="font-black text-gray-800 text-lg mt-1">修理厂</h3>
        <p className="text-sm text-gray-500">点击工具修理车辆！</p>
      </div>

      {/* Vehicle in workshop */}
      <div
        className={`bg-white rounded-2xl border-2 border-gray-200 p-6 mb-4 flex flex-col items-center cursor-pointer select-none transition-all ${tapping ? 'scale-95 bg-yellow-50' : ''}`}
        onClick={handleTap}
      >
        <VehicleVisual type={vehicle.type} fixed={false} size="lg" problem={vehicle.problem} />
        <p className="font-black text-gray-800 text-lg mt-3">{vehicle.name}</p>
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 mt-2">
          <p className="text-sm text-red-600 font-bold">⚠️ {vehicle.problem}</p>
        </div>
        <p className="text-xs text-gray-400 mt-2">👆 点击车辆开始修理！</p>

        {/* Sparkle effect */}
        {showSparkle && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-4xl animate-ping">✨</span>
          </div>
        )}

        {/* Success */}
        {showSuccess && (
          <div className="absolute inset-0 bg-green-500/20 rounded-2xl flex items-center justify-center">
            <span className="text-6xl animate-bounce">🎉</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-gray-200 rounded-full h-4 overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-xs text-gray-500 mb-4">{progress}% 修复完成</p>

      {/* Tool */}
      {tool && (
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-4 flex flex-col items-center">
          <p className="text-xs text-gray-500 mb-2">使用的工具：</p>
          <div className="text-4xl mb-2" title={tool.name}>
            {tool.emoji}
          </div>
          <p className="font-bold text-gray-700 text-sm">{tool.name}</p>
          <p className="text-xs text-gray-400 mt-1">
            {problem?.description}
          </p>
        </div>
      )}
    </div>
  );
}

// ================== Hero Garage ==================

function HeroGarage({
  vehicles,
  onDelete,
}: {
  vehicles: Vehicle[];
  onDelete: (v: Vehicle) => void;
}) {
  const [selected, setSelected] = useState<Vehicle | null>(null);

  if (vehicles.length === 0) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-3xl border-2 border-amber-200 p-8 text-center">
        <span className="text-5xl block mb-3">🏆</span>
        <h3 className="font-black text-gray-800 text-lg mb-1">英雄车库</h3>
        <p className="text-sm text-gray-500">还没有救援成功的车辆...</p>
        <p className="text-xs text-gray-400 mt-1">快去救援工程车吧！🚜</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-3xl border-2 border-amber-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <h3 className="font-black text-gray-800 text-lg">英雄车库</h3>
        </div>
        <span className="text-xs bg-amber-200 text-amber-800 px-3 py-1 rounded-full font-bold">
          {vehicles.length} 辆
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="bg-white rounded-2xl border-2 border-amber-200 p-3 flex flex-col items-center hover:scale-105 transition-transform cursor-pointer"
            onClick={() => setSelected(v)}
          >
            <VehicleVisual type={v.type} fixed={true} size="md" />
            <p className="text-xs font-bold text-gray-700 mt-1 text-center">{v.name}</p>
            {v.rescueDate && (
              <p className="text-xs text-gray-400">{v.rescueDate}</p>
            )}
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <VehicleVisual type={selected.type} fixed={true} size="lg" />
              <h2 className="text-xl font-black text-gray-800 mt-2">{selected.name}</h2>
              <p className="text-sm text-gray-500">
                {VEHICLE_TYPES[selected.type as keyof typeof VEHICLE_TYPES]?.name || selected.type}
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-3">
                <p className="text-sm text-green-700 font-medium">✅ {selected.problem} — 已修复！</p>
              </div>
              {selected.rescueDate && (
                <p className="text-xs text-gray-400 mt-2">救援日期：{selected.rescueDate}</p>
              )}
              {selected.notes && (
                <p className="text-sm text-gray-600 mt-2 italic">"{selected.notes}"</p>
              )}
              <p className="text-xs text-amber-600 mt-2 font-bold">
                🏆 被 {selected.rescuedBy || '派派'} 成功救援！
              </p>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { onDelete(selected); setSelected(null); }}
                className="flex-1 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
              >
                🗑️ 删除
              </button>
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================== New Arrival Modal ==================

function NewArrivalModal({
  vehicle,
  onConfirm,
  onSkip,
}: {
  vehicle: Vehicle;
  onConfirm: (v: Vehicle) => void;
  onSkip: () => void;
}) {
  const vtype = VEHICLE_TYPES[vehicle.type as keyof typeof VEHICLE_TYPES];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
        <div className="animate-bounce">
          <span className="text-6xl block mb-2">🚨</span>
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-1">有车需要救援！</h2>
        <p className="text-sm text-gray-500 mb-4">一辆 {vtype?.name} 遇到了困难...</p>

        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <VehicleVisual type={vehicle.type} fixed={false} size="lg" problem={vehicle.problem} />
          <p className="font-black text-gray-800 text-lg mt-2">{vehicle.name}</p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 mt-2 inline-block">
            <p className="text-sm text-red-600 font-bold">⚠️ {vehicle.problem}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            待会再说
          </button>
          <button
            onClick={() => onConfirm(vehicle)}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow transition-colors"
          >
            🚨 去救援！
          </button>
        </div>
      </div>
    </div>
  );
}

// ================== Main Page ==================

const INITIAL_BROKEN: Vehicle[] = [
  {
    _recordId: '', id: 'broken-1', name: '挖掘机小黄', type: 'excavator',
    problem: '轮胎漏气了！', fixed: false, damageLevel: 1,
    rescueDate: '', rescuedBy: '派派', notes: '',
  },
  {
    _recordId: '', id: 'broken-2', name: '水泥搅拌车', type: 'cement_mixer',
    problem: '滚筒卡住了！', fixed: false, damageLevel: 2,
    rescueDate: '', rescuedBy: '派派', notes: '',
  },
];

const POSSIBLE_NEW_ARRIVALS: Omit<Vehicle, 'id' | 'rescueDate' | 'rescuedBy' | 'notes'>[] = [
  { _recordId: '', name: '大吊车威威', type: 'crane', problem: '吊臂伸不出来了！', fixed: false, damageLevel: 1 },
  { _recordId: '', name: '推土机咚咚', type: 'bulldozer', problem: '推土铲坏了！', fixed: false, damageLevel: 1 },
  { _recordId: '', name: '翻斗车蹦蹦', type: 'dump_truck', problem: '车厢翻不起来！', fixed: false, damageLevel: 2 },
  { _recordId: '', name: '装载机轰轰', type: 'loader', problem: '装载斗转不动！', fixed: false, damageLevel: 1 },
  { _recordId: '', name: '压路机稳稳', type: 'roller', problem: '发动机抖得厉害！', fixed: false, damageLevel: 3 },
];

export default function RescueStationPage() {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [brokenQueue, setBrokenQueue] = useState<Vehicle[]>([]);
  const [workshopVehicle, setWorkshopVehicle] = useState<Vehicle | null>(null);
  const [showArrival, setShowArrival] = useState(false);
  const [nextArrival, setNextArrival] = useState<Vehicle | null>(null);
  const [rescuedCount, setRescuedCount] = useState(0);
  const [justRescued, setJustRescued] = useState<Vehicle | null>(null);
  const arrivalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from cloud/local on mount
  useEffect(() => {
    loadVehiclesFromCloud().then((fromCloud) => {
      if (fromCloud.length > 0) {
        setAllVehicles(fromCloud);
        setBrokenQueue(fromCloud.filter((v) => !v.fixed));
      }
    });
    const saved = localStorage.getItem('paipai-rescue-vehicles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Vehicle[];
        setAllVehicles(parsed);
        setBrokenQueue(parsed.filter((v) => !v.fixed));
        setRescuedCount(parsed.filter((v) => v.fixed).length);
      } catch {}
    }
    if (!localStorage.getItem('paipai-rescue-initialized')) {
      setBrokenQueue(INITIAL_BROKEN);
      localStorage.setItem('paipai-rescue-initialized', '1');
    }
  }, []);

  // Save to local on change
  useEffect(() => {
    if (allVehicles.length > 0) {
      localStorage.setItem('paipai-rescue-vehicles', JSON.stringify(allVehicles));
      localStorage.setItem('paipai-rescue-rescued', String(rescuedCount));
    }
  }, [allVehicles, rescuedCount]);

  // Auto new arrival every ~45 seconds
  const scheduleNextArrival = useCallback(() => {
    if (arrivalTimerRef.current) clearTimeout(arrivalTimerRef.current);
    arrivalTimerRef.current = setTimeout(() => {
      const template = POSSIBLE_NEW_ARRIVALS[Math.floor(Math.random() * POSSIBLE_NEW_ARRIVALS.length)];
      const arrival: Vehicle = {
        ...template,
        id: `broken-${Date.now()}`,
        rescueDate: new Date().toISOString().split('T')[0],
        rescuedBy: '派派',
        notes: '',
      };
      setNextArrival(arrival);
      setShowArrival(true);
    }, 45000);
  }, []);

  useEffect(() => {
    scheduleNextArrival();
    return () => {
      if (arrivalTimerRef.current) clearTimeout(arrivalTimerRef.current);
    };
  }, [scheduleNextArrival]);

  const handleRescue = useCallback((vehicle: Vehicle) => {
    setBrokenQueue((q) => q.filter((v) => v.id !== vehicle.id));
    setWorkshopVehicle(vehicle);
    setShowArrival(false);
    scheduleNextArrival();
  }, [scheduleNextArrival]);

  const handleSkipArrival = useCallback(() => {
    setShowArrival(false);
    scheduleNextArrival();
  }, [scheduleNextArrival]);

  const handleConfirmArrival = useCallback((vehicle: Vehicle) => {
    setShowArrival(false);
    setBrokenQueue((q) => {
      if (q.find((v) => v.id === vehicle.id)) return q;
      return [...q, vehicle];
    });
    scheduleNextArrival();
  }, [scheduleNextArrival]);

  const handleFixed = useCallback((vehicle: Vehicle) => {
    const fixedVehicle: Vehicle = {
      ...vehicle,
      fixed: true,
      rescueDate: new Date().toISOString().split('T')[0],
    };

    setAllVehicles((prev) => {
      const existing = prev.findIndex((v) => v.id === vehicle.id);
      const updated = existing >= 0
        ? prev.map((v) => (v.id === vehicle.id ? fixedVehicle : v))
        : [...prev, fixedVehicle];
      // Sync to cloud
      saveVehicleToCloud(fixedVehicle);
      return updated;
    });
    setRescuedCount((c) => c + 1);
    setWorkshopVehicle(null);
    setJustRescued(fixedVehicle);
    setTimeout(() => setJustRescued(null), 3000);
    scheduleNextArrival();
  }, [scheduleNextArrival]);

  const handleDeleteFromGarage = useCallback(async (vehicle: Vehicle) => {
    setAllVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
    if (vehicle._recordId) {
      await deleteVehicleFromCloud(vehicle._recordId);
    }
    setRescuedCount((c) => Math.max(0, c - 1));
  }, []);

  const handleNewBroken = useCallback(() => {
    const template = POSSIBLE_NEW_ARRIVALS[Math.floor(Math.random() * POSSIBLE_NEW_ARRIVALS.length)];
    const newVehicle: Vehicle = {
      ...template,
      id: `broken-${Date.now()}`,
      rescueDate: new Date().toISOString().split('T')[0],
      rescuedBy: '派派',
      notes: '',
    };
    setBrokenQueue((q) => [...q, newVehicle]);
  }, []);

  const heroVehicles = allVehicles.filter((v) => v.fixed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 pb-16">
      {/* Arrival modal */}
      {showArrival && nextArrival && (
        <NewArrivalModal
          vehicle={nextArrival}
          onConfirm={handleConfirmArrival}
          onSkip={handleSkipArrival}
        />
      )}

      {/* Just rescued toast */}
      {justRescued && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-black">{justRescued.name} 修复成功！</p>
            <p className="text-xs opacity-80">已加入英雄车库 🏆</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
          ← 返回点子站
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-2">🚜</span>
          <h1 className="text-3xl font-black text-gray-800">派派工程车救援站</h1>
          <p className="text-gray-400 mt-1">帮助需要救援的工程车，让它们重新强壮起来！</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: '等待救援', value: brokenQueue.length, icon: '🚨', color: 'bg-red-50 border-red-200' },
            { label: '修理中', value: workshopVehicle ? 1 : 0, icon: '🔧', color: 'bg-blue-50 border-blue-200' },
            { label: '已救援', value: rescuedCount, icon: '🏆', color: 'bg-amber-50 border-amber-200' },
            { label: '英雄车库', value: heroVehicles.length, icon: '🚗', color: 'bg-green-50 border-green-200' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`${color} border rounded-2xl p-3 text-center`}>
              <div className="text-2xl mb-0.5">{icon}</div>
              <div className="text-2xl font-black text-gray-800">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Workshop — always visible */}
        <div className="mb-8">
          {workshopVehicle ? (
            <Workshop
              key={workshopVehicle.id}
              vehicle={workshopVehicle}
              onFixed={handleFixed}
            />
          ) : (
            <div className="bg-gradient-to-b from-blue-50 to-indigo-100 rounded-3xl border-2 border-blue-200 p-8 text-center">
              <span className="text-5xl block mb-3">🔧</span>
              <p className="font-black text-gray-700 text-lg">修理厂空闲中</p>
              <p className="text-sm text-gray-500 mt-1">从下方选择一辆车来修理吧！</p>
              <p className="text-xs text-gray-400 mt-1">👇 点击「等待救援」里的车辆</p>
            </div>
          )}
        </div>

        {/* Broken vehicles queue */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚨</span>
              <h2 className="font-black text-gray-800 text-lg">等待救援</h2>
              {brokenQueue.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {brokenQueue.length}
                </span>
              )}
            </div>
            <button
              onClick={handleNewBroken}
              className="px-4 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full text-xs font-bold transition-colors"
            >
              + 新车到达
            </button>
          </div>

          {brokenQueue.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 text-center">
              <span className="text-5xl block mb-3">✅</span>
              <p className="font-black text-gray-700 text-lg">太棒了！</p>
              <p className="text-sm text-gray-500 mt-1">目前没有等待救援的车辆～</p>
              <button
                onClick={handleNewBroken}
                className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-bold shadow transition-colors"
              >
                + 模拟新车到达
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {brokenQueue.map((v) => (
                <BrokenVehicleCard key={v.id} vehicle={v} onRescue={handleRescue} />
              ))}
            </div>
          )}
        </div>

        {/* Hero Garage */}
        <HeroGarage vehicles={heroVehicles} onDelete={handleDeleteFromGarage} />
      </div>
    </div>
  );
}
