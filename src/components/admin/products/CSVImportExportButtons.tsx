
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import React from "react";

type Props = {
  isUploading: boolean;
  handleExport: () => void;
  handleImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function CSVImportExportButtons({ isUploading, handleExport, handleImport }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" />
        Экспорт CSV
      </Button>
      <div className="relative">
        <Button variant="outline" disabled={isUploading}>
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Загрузка...' : 'Импорт CSV'}
        </Button>
        <input
          type="file"
          accept=".csv"
          onChange={handleImport}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isUploading}
        />
      </div>
    </div>
  );
}
