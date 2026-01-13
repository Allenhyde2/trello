import { useState } from 'react';
import { Bug } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BugReportDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (bug: Omit<Bug, 'Id' | 'Status' | 'Comments' | 'CreatedAt'>) => void;
}

export function BugReportDialog({ open, onClose, onSubmit }: BugReportDialogProps) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = () => {
    if (!title) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    onSubmit({
      Title: title,
      Description: desc,
      ImageUrl: imageUrl
    });
    // Reset
    setTitle('');
    setDesc('');
    setImageUrl('');
    onClose();
  };

  // Mock upload functionality for now (since we don't have a real backend for file storage in this context)
  // In a real app, this would upload to S3/Supabase Storage
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;

     setIsUploading(true);
     // Simulate upload delay
     setTimeout(() => {
        // Create a fake local URL for preview
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setIsUploading(false);
        toast.success('이미지가 첨부되었습니다.');
     }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>버그 리포트</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="bug-title">제목 *</Label>
            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="버그 요약"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bug-desc">상세 설명</Label>
            <Textarea
              id="bug-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="버그 발생 경로 및 현상 설명"
              className="min-h-[100px]"
            />
          </div>
          <div className="grid gap-2">
            <Label>스크린샷 (선택)</Label>
            <div className="flex items-center gap-4">
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => document.getElementById('bug-image-upload')?.click()}
                 disabled={isUploading}
               >
                 {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImagePlus className="w-4 h-4 mr-2" />}
                 이미지 업로드
               </Button>
               <input 
                 id="bug-image-upload" 
                 type="file" 
                 className="hidden" 
                 accept="image/*"
                 onChange={handleImageUpload}
               />
               {imageUrl && (
                   <span className="text-xs text-green-600 truncate max-w-[150px]">
                       이미지 첨부됨
                   </span>
               )}
            </div>
            {imageUrl && (
                <div className="mt-2 border rounded p-1 bg-gray-50">
                    <img src={imageUrl} alt="Preview" className="max-h-[150px] object-contain mx-auto" />
                </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700 text-white">
             리포트 등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
