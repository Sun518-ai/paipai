import type { Metadata } from 'next';
import './globals.css';
import TodoChat from '@/components/TodoChat';

export const metadata: Metadata = {
  title: '💡 派派的点子站',
  description: '记录派派的每一个奇妙想法 ✨',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        <TodoChat />
      </body>
    </html>
  );
}
