import { Card } from '@/components/ui/card';

export default function GoalDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6 mt-4">
        <div className="h-5 w-16 bg-background rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          {/* 目標カード */}
          <Card className="mb-6">
            <div className="h-7 w-3/4 bg-background rounded animate-pulse mb-3" />
            <div className="flex gap-3">
              <div className="h-4 w-32 bg-background rounded animate-pulse" />
              <div className="h-6 w-16 bg-background rounded animate-pulse" />
            </div>
          </Card>

          {/* 活動記録セクション */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-24 bg-background rounded animate-pulse" />
              <div className="h-9 w-32 bg-background rounded-lg animate-pulse" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <div className="h-4 bg-background rounded animate-pulse mb-2" />
                  <div className="h-3 w-32 bg-background rounded animate-pulse" />
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* サイドバー */}
        <aside className="lg:col-span-1 space-y-4">
          <Card>
            <div className="h-5 w-32 bg-background rounded animate-pulse mb-3" />
            <div className="space-y-2">
              <div className="h-3 bg-background rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-background rounded animate-pulse" />
            </div>
          </Card>
          <Card>
            <div className="h-5 w-32 bg-background rounded animate-pulse mb-3" />
            <div className="h-32 bg-background rounded animate-pulse" />
          </Card>
          <Card>
            <div className="h-5 w-32 bg-background rounded animate-pulse mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 bg-background rounded-lg animate-pulse" />
              <div className="h-20 bg-background rounded-lg animate-pulse" />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
