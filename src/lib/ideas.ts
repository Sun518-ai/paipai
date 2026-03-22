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
    id: 'collection',
    title: '派派工程车收集卡',
    description: '🃏 超好玩！翻翻卡游戏来啦！10种超酷工程车都有专属收集卡，点击翻开查看详情。派派见过真的就记录下来，集齐全套召唤工程车大师！内置进度条、嘀嘀喇叭声、收集庆祝动画！',
    tags: ['游戏', '翻卡', '工程车', '收集', '动画', '儿童'],
    status: 'done',
    date: '2026-03-22',
    icon: '🃏',
  },
  {
    id: 'eggs',
    title: '派派彩蛋对对碰',
    description: '翻翻乐彩蛋配对游戏！找相同的彩蛋，完成3轮就能孵化小动物！小鸡、小鸭、小狗、小猫...收集一整个小动物园！',
    tags: ['游戏', '彩蛋', '孵化', '动物', '儿童'],
    status: 'done',
    date: '2026-03-22',
    icon: '🥚',
  },
  {
    id: 'trucks',
    title: '派派工程车王国',
    description: '探索10种超酷工程车！听车车叫声、标记真实见过的工程车、收藏最爱。派派的最爱——挖掘机、吊车、消防车全都有！',
    tags: ['React', '工程车', '声音', '互动', '儿童'],
    status: 'done',
    date: '2026-03-22',
    icon: '🏗️',
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
