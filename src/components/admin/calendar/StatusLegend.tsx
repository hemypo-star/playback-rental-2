
const StatusLegend = () => {
  return (
    <div className="mt-6 flex items-center justify-end gap-4">
      <div className="text-sm text-muted-foreground">Статусы:</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs">Подтверждено</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span className="text-xs">В ожидании</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs">Отменено</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs">Завершено</span>
        </div>
      </div>
    </div>
  );
};

export default StatusLegend;
