
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function CategoryLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((idx) => (
        <Card key={idx} className="animate-pulse">
          <CardHeader className="bg-muted h-24"></CardHeader>
          <CardContent className="p-4">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
