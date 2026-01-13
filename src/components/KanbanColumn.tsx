import { useDrop } from 'react-dnd';
import { Badge } from './ui/badge';
import { StatusDemanda } from '../types';
import { cn } from './ui/utils';

interface KanbanColumnProps {
  status: StatusDemanda;
  title: string;
  count: number;
  children: React.ReactNode;
  onDrop: (id: string, status: StatusDemanda) => void;
  className?: string;
}

export function KanbanColumn({ status, title, count, children, onDrop, className }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'DEMAND_CARD',
    drop: (item: { id: string }) => onDrop(item.id, status),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={cn(
        "flex flex-col rounded-lg transition-colors duration-200",
        isOver ? "bg-slate-100/50 ring-2 ring-[#007e7a]/50" : "",
        className
      )}
    >
      <div className="bg-white rounded-t-lg p-4 flex items-center justify-between shadow-sm">
        <h2 className="text-gray-900 font-semibold">{title}</h2>
        <Badge variant="secondary" className="text-lg">
          {count}
        </Badge>
      </div>
      <div className="bg-white/50 rounded-b-lg p-4 min-h-[400px] max-h-[calc(100vh-400px)] overflow-y-auto">
        {children}
        {count === 0 && (
          <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-200 rounded-lg">
            이곳으로 카드를 드래그하세요
          </div>
        )}
      </div>
    </div>
  );
}
