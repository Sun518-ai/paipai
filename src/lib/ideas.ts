export interface Idea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: 'planned' | 'wip' | 'done';
  date: string;
  icon: string;
}

export const ideas: Idea[] = [
  {
    id: 'sounds',
    title: '派派听听乐',
    description: '🎵 听声音猜答案！15种有趣的声音等你来挑战！车车、动物、大自然...听听看是什么？答对了有彩纸庆祝哦！',
    tags: ['游戏', '声音', '猜谜', '音乐', '儿童'],
    status: 'done',
    date: '2026-03-22',
    icon: '🎵',
  },

  {
    id: 'todomcv',
    title: 'TodoMVC',
    description: '一个简洁优雅的待办事项管理应用，支持添加、完成、删除任务，任务状态持久化保存。',
    tags: ['React', '状态管理', '本地存储'],
    status: 'done',
    date: '2026-03-21',
    icon: '✅',
  },
  {
    id: 'snake-game',
    title: '贪食蛇',
    description: '经典童年游戏重制版！用方向键控制蛇的移动，吃食物增长身体，碰到墙壁或自己就Game Over。',
    tags: ['Canvas', '游戏', '键盘控制'],
    status: 'done',
    date: '2026-03-21',
    icon: '🐍',
  },
  {
    id: 'insects',
    title: '派派昆虫百科',
    description: '像宝可梦集卡一样收集昆虫！每个昆虫都有稀有度星级、类型、发现地点，可以拍照记录，还有派派笔记。',
    tags: ['React', '集卡', '百科', '宝可梦风格'],
    status: 'done',
    date: '2026-03-21',
    icon: '🐛',
  },
  {
    id: 'photography',
    title: '美好时光相册',
    description: '记录妈妈和派派的温馨时刻。支持上传照片、轮播播放、左右滑动切换，相册第一张照片已就位。',
    tags: ['React', '相册', '轮播', '本地存储'],
    status: 'done',
    date: '2026-03-21',
    icon: '📷',
  },
  {
    id: 'countdown',
    title: '派派倒计时',
    description: '记录期待的日子！生日、节日、假期...每一个重要时刻都有倒计时陪伴。精确到秒！',
    tags: ['React', '倒计时', '本地存储'],
    status: 'done',
    date: '2026-03-21',
    icon: '⏰',
  },
];
