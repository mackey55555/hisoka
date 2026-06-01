import { Card } from '@/components/ui/card';

export default function TrainerDashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="h-7 w-64 bg-background rounded animate-pulse mb-6 mt-4" />

      <div className="mb-6">
        <div className="h-6 w-40 bg-background rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-background animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 w-40 bg-background rounded animate-pulse mb-2" />
                  <div className="h-3 w-56 bg-background rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
