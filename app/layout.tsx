import './globals.css';

export const metadata = {
  title: '派派工程车俱乐部 🚜',
  description: 'Construction Vehicle Club for Paipai',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
