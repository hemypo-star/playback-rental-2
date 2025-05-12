
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type StorageStatusAlertProps = {
  error: string | null;
  isCheckingStorage: boolean;
  onCheckStorage: () => void;
}

export default function StorageStatusAlert({
  error,
  isCheckingStorage,
  onCheckStorage
}: StorageStatusAlertProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Проблема с хранилищем изображений</AlertTitle>
      <AlertDescription>
        {error || 'Возникли проблемы с хранилищем изображений. Загрузка новых изображений может быть недоступна.'}
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            onClick={onCheckStorage}
            disabled={isCheckingStorage}
          >
            {isCheckingStorage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Проверка...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" /> Проверить соединение
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
