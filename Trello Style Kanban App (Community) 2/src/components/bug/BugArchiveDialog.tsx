import { Bug } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface BugArchiveDialogProps {
  open: boolean;
  onClose: () => void;
  bugs?: Bug[];
}

export function BugArchiveDialog({ open, onClose, bugs = [] }: BugArchiveDialogProps) {
  const resolvedBugs = bugs.filter(b => b.Status === 'Resolved');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>해결된 버그 기록</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
           {resolvedBugs.length === 0 ? (
               <div className="text-center py-10 text-gray-500">
                   해결된 버그가 없습니다.
               </div>
           ) : (
               <div className="space-y-3">
                   {resolvedBugs.map(bug => (
                       <div key={bug.Id} className="p-3 border rounded-lg bg-gray-50 opacity-75">
                           <div className="flex items-start justify-between mb-1">
                               <span className="font-medium text-gray-900 line-through decoration-gray-400">
                                   {bug.Title}
                               </span>
                               <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                   Resolved
                               </Badge>
                           </div>
                           <p className="text-xs text-gray-500 mb-2">{bug.Description}</p>
                           <div className="flex items-center gap-2 text-xs text-gray-400">
                               <CheckCircle2 className="w-3 h-3" />
                               <span>{bug.ResolvedAt ? new Date(bug.ResolvedAt).toLocaleDateString() : 'Unknown date'}</span>
                               {bug.Comments && bug.Comments.length > 0 && (
                                   <span>• 코멘트 {bug.Comments.length}개</span>
                               )}
                           </div>
                       </div>
                   ))}
               </div>
           )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
