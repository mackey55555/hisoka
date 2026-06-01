import { Card } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* 挨拶 */}
      <div className="mb-8 mt-4">
        <div className="h-7 w-64 bg-background rounded animate-pulse mb-2" />
        <div className="h-4 w-80 bg-background rounded animate-pulse" />
      </div>

      {/* 今日の活動を記録 */}
      <div className="mb-6 bg-primary/5 border border-primary/30 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="h-5 w-40 bg-background rounded animate-pulse mb-2" />
            <div className="h-3 w-56 bg-background rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* 統計 2カード */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="h-3 w-20 bg-background rounded animate-pulse mb-2" />
          <div className="h-8 w-16 bg-background rounded animate-pulse" />
        </Card>
        <Card>
          <div className="h-3 w-20 bg-background rounded animate-pulse mb-2" />
          <div className="h-8 w-16 bg-background rounded animate-pulse" />
        </Card>
      </div>

      {/* StreakCard */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-background animate-pulse" />
            <div>
              <div className="h-10 w-16 bg-background rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-background rounded animate-pulse" />
            </div>
          </div>
          <div>
            <div className="h-3 w-10 bg-background rounded animate-pulse mb-1" />
            <div className="h-5 w-12 bg-background rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="h-3 w-4 bg-background rounded animate-pulse mb-1.5" />
              <div className="w-10 h-10 rounded-full bg-background animate-pulse" />
            </div>
          ))}
        </div>
      </Card>

      {/* 月次振り返り */}
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="h-5 w-48 bg-background rounded animate-pulse mb-1" />
            <div className="h-3 w-40 bg-background rounded animate-pulse" />
          </div>
          <div className="h-7 w-16 bg-background rounded animate-pulse" />
        </div>
        <div className="py-6 text-center bg-background/60 rounded-lg">
          <div className="h-3 w-48 bg-background rounded animate-pulse mx-auto mb-3" />
          <div className="h-9 w-24 bg-background rounded-lg animate-pulse mx-auto" />
        </div>
      </Card>

      {/* 目標一覧 */}
      <div className="mb-6">
        <div className="h-6 w-24 bg-background rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <div className="h-5 w-3/4 bg-background rounded animate-pulse mb-2" />
              <div className="h-3 w-full bg-background rounded animate-pulse" />
            </Card>
          ))}
        </div>
      </div>

      {/* 月別活動数 */}
      <Card className="mb-8">
        <div className="h-5 w-32 bg-background rounded animate-pulse mb-4" />
        <div className="h-48 bg-background rounded animate-pulse" />
      </Card>
    </div>
  );
}
