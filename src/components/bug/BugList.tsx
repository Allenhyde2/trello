import { Bug } from '../../types';
import { Badge } from '../ui/badge';
import { AlertTriangle, Archive, CheckCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';

interface BugListProps {
  bugs?: Bug[];
  onSelectBug: (bug: Bug) => void;
  onOpenArchive: () => void;
}

export function BugList({ bugs = [], onSelectBug, onOpenArchive }: BugListProps) {
  // Resolved가 아닌 버그만 필터링 (활성 버그)
  const activeBugs = bugs.filter(b => b.Status !== 'Resolved');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
         <span className="text-sm font-medium text-gray-700">
             활성 버그 ({activeBugs.length})
         </span>
         <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-500" onClick={onOpenArchive}>
            <Archive className="w-3 h-3 mr-1" />
            기록 보기
         </Button>
      </div>

      {activeBugs.length === 0 ? (
        <div className="text-sm text-gray-400 italic py-2">
          등록된 버그가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {activeBugs.map(bug => (
            <div 
              key={bug.Id}
              onClick={() => onSelectBug(bug)}
              className="flex items-center gap-2 p-2 rounded-md border bg-red-50/50 hover:bg-red-100/50 border-red-100 cursor-pointer transition-colors"
            >
              {bug.Status === 'Confirmed' ? (
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              <span className="text-sm text-gray-800 truncate flex-1">{bug.Title}</span>
              <Badge variant="outline" className="text-[10px] bg-white h-5">
                 {bug.Comments?.length || 0}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
