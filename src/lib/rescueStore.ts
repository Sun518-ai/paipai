// ================== Types ==================

export interface Vehicle {
  _recordId?: string;
  id: string;
  name: string;
  type: string;
  problem: string;
  fixed: boolean;
  damageLevel: number;
  rescueDate: string;
  rescuedBy: string;
  notes: string;
}

// ================== Vehicle Types ==================

export const VEHICLE_TYPES: Record<string, { name: string; emoji: string }> = {
  excavator: { name: '挖掘机', emoji: '🚜' },
  dump_truck: { name: '翻斗车', emoji: '🚛' },
  crane: { name: '吊车', emoji: '🏗️' },
  bulldozer: { name: '推土机', emoji: '🟠' },
  cement_mixer: { name: '水泥搅拌车', emoji: '🚚' },
  loader: { name: '装载机', emoji: '🔶' },
  roller: { name: '压路机', emoji: '🟡' },
};

// ================== Problems & Tools ==================

export interface Problem {
  name: string;
  emoji: string;
  description: string;
}

export const PROBLEMS: Problem[] = [
  { name: '轮胎漏气了！', emoji: '🔴', description: '轮胎被扎破了，需要补气' },
  { name: '滚筒卡住了！', emoji: '🔧', description: '水泥滚筒转不动，需要润滑' },
  { name: '吊臂伸不出来了！', emoji: '🦯', description: '液压系统有问题，需要修复' },
  { name: '推土铲坏了！', emoji: '🔩', description: '推土铲变形了，需要矫正' },
  { name: '车厢翻不起来！', emoji: '🦾', description: '车厢升降坏了，需要维修' },
  { name: '装载斗转不动！', emoji: '⚙️', description: '转动机构卡住了，需要润滑' },
  { name: '发动机抖得厉害！', emoji: '💨', description: '发动机有问题，需要检查' },
  { name: '油漆掉了！', emoji: '🎨', description: '车身油漆脱落，需要补漆' },
  { name: '车灯不亮了！', emoji: '💡', description: '灯泡坏了，需要换灯泡' },
  { name: '声音沙哑了！', emoji: '📢', description: '喇叭坏了，需要修理' },
];

export interface Tool {
  name: string;
  emoji: string;
}

export const TOOLS: Tool[] = [
  { name: '打气筒', emoji: '🔴' },
  { name: '润滑油', emoji: '🛢️' },
  { name: '扳手', emoji: '🔧' },
  { name: '锤子', emoji: '🔨' },
  { name: '电焊枪', emoji: '⚡' },
  { name: '油漆刷', emoji: '🎨' },
  { name: '灯泡', emoji: '💡' },
  { name: '小喇叭', emoji: '📢' },
];

export const TOOL_FOR_PROBLEM: Record<string, Tool> = {
  '轮胎漏气了！': { name: '打气筒', emoji: '🔴' },
  '滚筒卡住了！': { name: '润滑油', emoji: '🛢️' },
  '吊臂伸不出来了！': { name: '扳手', emoji: '🔧' },
  '推土铲坏了！': { name: '锤子', emoji: '🔨' },
  '车厢翻不起来！': { name: '电焊枪', emoji: '⚡' },
  '装载斗转不动！': { name: '润滑油', emoji: '🛢️' },
  '发动机抖得厉害！': { name: '扳手', emoji: '🔧' },
  '油漆掉了！': { name: '油漆刷', emoji: '🎨' },
  '车灯不亮了！': { name: '灯泡', emoji: '💡' },
  '声音沙哑了！': { name: '小喇叭', emoji: '📢' },
};

// ================== Cloud Sync ==================

export async function loadVehiclesFromCloud(): Promise<Vehicle[]> {
  try {
    const res = await fetch('/api/rescue');
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.ok || !json.vehicles) return [];
    return json.vehicles as Vehicle[];
  } catch {
    return [];
  }
}

export async function saveVehicleToCloud(vehicle: Vehicle): Promise<void> {
  try {
    await fetch('/api/rescue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', vehicle }),
    });
  } catch {}
}

export async function deleteVehicleFromCloud(recordId: string): Promise<void> {
  try {
    await fetch('/api/rescue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', recordId }),
    });
  } catch {}
}
