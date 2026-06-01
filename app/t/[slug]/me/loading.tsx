import { Card } from '@/components/ui/card';

export default function MeLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6 mt-4">
        <div className="h-7 w-32 bg-background rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-background rounded animate-pulse" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <div className="h-5 w-32 bg-background rounded animate-pulse mb-1" />
            <div className="h-3 w-48 bg-background rounded animate-pulse mb-4" />
            <div className="h-12 bg-background rounded-lg animate-pulse mb-3" />
            <div className="h-10 w-32 bg-background rounded-lg animate-pulse" />
          </Card>
        ))}
      </div>
    </div>
  );
}
