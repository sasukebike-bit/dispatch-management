import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "配車管理システム",
  description: "物流・デリバリー向け自動配車Webアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-blue-700 text-white shadow">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-8">
            <span className="font-bold text-lg tracking-wide">配車管理</span>
            <Link href="/orders" className="hover:text-blue-200 transition-colors text-sm font-medium">
              オーダー
            </Link>
            <Link href="/drivers" className="hover:text-blue-200 transition-colors text-sm font-medium">
              配達員
            </Link>
            <Link href="/dispatch" className="hover:text-blue-200 transition-colors text-sm font-medium">
              配車結果
            </Link>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
