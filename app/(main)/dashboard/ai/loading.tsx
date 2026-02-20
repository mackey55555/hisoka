import { Card } from '@/components/ui/card';

export default function AiDashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="w-8 h-8" />
        <div className="h-7 w-48 bg-background rounded animate-pulse" />
        <div className="w-8 h-8" />
      </div>

      {/* 要約カード */}
      <Card className="mb-6">
        <div className="h-5 w-24 bg-background rounded animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-background rounded animate-pulse" />
          <div className="h-4 bg-background rounded animate-pulse w-3/4" />
        </div>
      </Card>

      {/* ネガポジ分析 */}
      <Card className="mb-6">
        <div className="h-5 w-32 bg-background rounded animate-pulse mb-4" />
        <div className="h-3 bg-background rounded-full animate-pulse mb-4" />
        <div className="h-4 bg-background rounded-full animate-pulse mb-4" />
        <div className="h-40 bg-background rounded animate-pulse" />
      </Card>

      {/* パーソナリティ特性 */}
      <Card className="mb-6">
        <div className="h-5 w-40 bg-background rounded animate-pulse mb-4" />
        <div className="h-64 bg-background rounded animate-pulse" />
      </Card>
    </div>
  );
}
