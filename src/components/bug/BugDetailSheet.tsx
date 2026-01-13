import { useState } from 'react';
import { Bug, BugComment } from '../../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../ui/sheet';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { MessageSquare, CheckCircle, AlertCircle, Clock, Image as ImageIcon, Send, Archive } from 'lucide-react';
import { toast } from 'sonner';

interface BugDetailSheetProps {
  bug: Bug | null;
  open: boolean;
  onClose: () => void;
  onUpdateStatus: (bugId: string, status: Bug['Status']) => void;
  onAddComment: (bugId: string, content: string) => void;
  currentUser: string; // 현재 사용자 이름 (코멘트용)
}

export function BugDetailSheet({
  bug,
  open,
  onClose,
  onUpdateStatus,
  onAddComment,
  currentUser
}: BugDetailSheetProps) {
  const [newComment, setNewComment] = useState('');

  if (!bug) return null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    onAddComment(bug.Id, newComment);
    setNewComment('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">해결됨</Badge>;
      case 'Confirmed': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">확인됨</Badge>;
      default: return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">제보됨</Badge>;
    }
  };

  // 토글 로직
  const handleToggleConfirmed = () => {
      const newStatus = bug.Status === 'Confirmed' ? 'Reported' : 'Confirmed';
      onUpdateStatus(bug.Id, newStatus);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge(bug.Status)}
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(bug.CreatedAt).toLocaleDateString()}
            </span>
          </div>
          <SheetTitle className="text-xl">{bug.Title}</SheetTitle>
          <SheetDescription>
            {bug.Description || '설명이 없습니다.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 py-6 px-1 space-y-6">
          {/* 이미지 섹션 */}
          {bug.ImageUrl && (
            <div className="rounded-lg border bg-slate-50 p-2 overflow-hidden">
              <img 
                src={bug.ImageUrl} 
                alt="Bug Screenshot" 
                className="w-full h-auto object-contain max-h-[300px] rounded"
              />
            </div>
          )}

          <Separator />

          {/* 상태 관리 액션 */}
          <div className="space-y-3">
             <h4 className="text-sm font-medium text-gray-900">상태 관리</h4>
             <div className="flex gap-2 flex-wrap">
               <Button 
                 variant={bug.Status === 'Confirmed' ? "default" : "outline"}
                 size="sm"
                 onClick={handleToggleConfirmed}
                 className={bug.Status === 'Confirmed' ? "bg-blue-600 hover:bg-blue-700" : ""}
               >
                 <CheckCircle className="w-4 h-4 mr-2" />
                 {bug.Status === 'Confirmed' ? '확인됨 (Confirmed)' : '확인 (Confirm)'}
               </Button>
               
               <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                      if (confirm('이 버그를 해결 처리하고 아카이브하시겠습니까?')) {
                          onUpdateStatus(bug.Id, 'Resolved');
                          onClose(); // 닫기
                      }
                  }}
                  className="text-green-600 border-green-200 hover:bg-green-50"
               >
                 <Archive className="w-4 h-4 mr-2" />
                 해결 및 아카이브
               </Button>
             </div>
          </div>

          <Separator />

          {/* 댓글 섹션 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              코멘트 ({bug.Comments?.length || 0})
            </h4>

            <ScrollArea className="h-[200px] rounded-md border p-4 bg-gray-50/50">
              {bug.Comments && bug.Comments.length > 0 ? (
                <div className="space-y-4">
                  {bug.Comments.map((comment) => (
                    <div key={comment.Id} className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{comment.AuthorName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.CreatedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 bg-white p-2 rounded border shadow-sm">
                        {comment.Content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8 text-sm">
                  아직 코멘트가 없습니다.
                </div>
              )}
            </ScrollArea>

            {/* 댓글 입력 */}
            <div className="flex gap-2">
              <Textarea 
                placeholder="코멘트를 남겨주세요..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="self-end"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
