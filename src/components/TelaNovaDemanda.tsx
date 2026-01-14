import { useState, useEffect } from 'react';
import { Demanda, Pessoa, ChecklistItem, Bug } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { X, Plus, Bug as BugIcon, ChevronRight, Folder } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { BugList } from './bug/BugList';
import { BugReportDialog } from './bug/BugReportDialog';
import { BugDetailSheet } from './bug/BugDetailSheet';
import { BugArchiveDialog } from './bug/BugArchiveDialog';
import { toast } from 'sonner';

interface TelaNovaDemandaProps {
  open: boolean;
  onClose: () => void;
  onSalvar: (demanda: Omit<Demanda, 'Id'>) => void;
  equipe: Pessoa[];
  demandaEdit?: Demanda | null;
  onAtualizar?: (id: string, updates: Partial<Demanda>) => void;
  // Bug management props
  onAddBug?: (demandaId: string, bug: Omit<Bug, 'Id' | 'Status' | 'Comments' | 'CreatedAt'>) => void;
  onUpdateBugStatus?: (demandaId: string, bugId: string, status: Bug['Status']) => void;
  onAddBugComment?: (demandaId: string, bugId: string, comment: string, author: string) => void;
}

export function TelaNovaDemanda({ 
  open, 
  onClose, 
  onSalvar, 
  equipe, 
  demandaEdit, 
  onAtualizar,
  onAddBug,
  onUpdateBugStatus,
  onAddBugComment
}: TelaNovaDemandaProps) {
  const [titulo, setTitulo] = useState('');
  const [projeto, setProjeto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataTarefa, setDataTarefa] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [novoItem, setNovoItem] = useState('');
  
  // Bug UI states
  const [showBugReport, setShowBugReport] = useState(false);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [showBugArchive, setShowBugArchive] = useState(false);

  // Preencher formulário ao editar
  useEffect(() => {
    if (demandaEdit) {
      setTitulo(demandaEdit.Titulo);
      setProjeto(demandaEdit.Projeto);
      setCategoria(demandaEdit.Categoria || '');
      setDescricao(demandaEdit.Descricao || '');
      setDataTarefa(new Date(demandaEdit.DataTarefa).toISOString().split('T')[0]);
      setPrazoEntrega(new Date(demandaEdit.PrazoEntrega).toISOString().split('T')[0]);
      setResponsavelId(demandaEdit.ResponsavelId);
      setChecklist(demandaEdit.Checklist);
    } else {
      limparFormulario();
    }
  }, [demandaEdit, open]);

  const limparFormulario = () => {
    setTitulo('');
    setProjeto('');
    setCategoria('');
    setDescricao('');
    setDataTarefa('');
    setPrazoEntrega('');
    setResponsavelId('');
    setChecklist([]);
    setNovoItem('');
  };

  const adicionarItemChecklist = () => {
    if (novoItem.trim()) {
      setChecklist([...checklist, { Item: novoItem.trim(), Concluido: false }]);
      setNovoItem('');
    }
  };

  const removerItemChecklist = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const toggleItemChecklist = (index: number) => {
    setChecklist(checklist.map((item, i) => 
      i === index ? { ...item, Concluido: !item.Concluido } : item
    ));
  };

  const handleSalvar = () => {
    if (!titulo || !projeto || !dataTarefa || !prazoEntrega || !responsavelId) {
      toast.error('모든 필수 항목을 입력해주세요.');
      return;
    }

    const responsavel = equipe.find(p => p.PessoaId === responsavelId);
    if (!responsavel) {
      toast.error('담당자를 찾을 수 없습니다.');
      return;
    }

    if (demandaEdit && onAtualizar) {
      // Atualizar demanda existente
      onAtualizar(demandaEdit.Id, {
        Titulo: titulo,
        Projeto: projeto,
        Categoria: categoria,
        Descricao: descricao,
        DataTarefa: new Date(dataTarefa),
        PrazoEntrega: new Date(prazoEntrega),
        ResponsavelId: responsavel.PessoaId,
        ResponsavelNome: responsavel.Nome,
        Checklist: checklist,
      });
    } else {
      // Criar nova demanda
      const novaDemanda: Omit<Demanda, 'Id'> = {
        Titulo: titulo,
        Projeto: projeto,
        Categoria: categoria,
        Descricao: descricao,
        DataTarefa: new Date(dataTarefa),
        PrazoEntrega: new Date(prazoEntrega),
        ResponsavelId: responsavel.PessoaId,
        ResponsavelNome: responsavel.Nome,
        Checklist: checklist,
        Status: 'Demandas em Fila', // Será ajustado pelo hook
      };

      onSalvar(novaDemanda);
    }

    limparFormulario();
    onClose();
  };

  const handleCancelar = () => {
    limparFormulario();
    onClose();
  };

  const handleReportBug = (bug: Omit<Bug, 'Id' | 'Status' | 'Comments' | 'CreatedAt'>) => {
      if (demandaEdit && onAddBug) {
          onAddBug(demandaEdit.Id, bug);
          toast.success('버그가 리포트되었습니다.');
      }
  };

  const handleUpdateBugStatus = (bugId: string, status: Bug['Status']) => {
      if (demandaEdit && onUpdateBugStatus) {
          onUpdateBugStatus(demandaEdit.Id, bugId, status);
          if (status === 'Resolved') {
             toast.success('버그가 해결 처리되어 아카이브되었습니다.');
             setSelectedBug(null); // Close detail view
          } else {
             toast.success('버그 상태가 업데이트되었습니다.');
             // Update local selected bug state to reflect changes immediately in UI
             if (selectedBug) {
                 setSelectedBug({ ...selectedBug, Status: status });
             }
          }
      }
  };

  const handleAddComment = (bugId: string, content: string) => {
      if (demandaEdit && onAddBugComment) {
          // In a real app, author would be current logged in user
          const currentUser = "현재 사용자"; 
          onAddBugComment(demandaEdit.Id, bugId, content, currentUser);
          toast.success('코멘트가 추가되었습니다.');
          
          // Optimistic update for UI
          if (selectedBug) {
               const newComment = {
                  Id: 'temp-' + Date.now(),
                  AuthorName: currentUser,
                  Content: content,
                  CreatedAt: new Date()
              };
              setSelectedBug({
                  ...selectedBug,
                  Comments: [...selectedBug.Comments, newComment]
              });
          }
      }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {demandaEdit ? '요청 상세 및 수정' : '새 요청'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">기본 정보</TabsTrigger>
                <TabsTrigger value="bugs" disabled={!demandaEdit}>버그 리포트 {demandaEdit?.Bugs?.filter(b => b.Status !== 'Resolved').length ? `(${demandaEdit.Bugs.filter(b => b.Status !== 'Resolved').length})` : ''}</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 py-4">
            
            {/* 1. 프로젝트 (최상단) */}
            <div className="space-y-2">
                <Label htmlFor="projeto">프로젝트 *</Label>
                <Input
                id="projeto"
                value={projeto}
                onChange={(e) => setProjeto(e.target.value)}
                placeholder="프로젝트 이름 입력"
                />
            </div>

            {/* 1.5 카테고리/디렉토리 (WBS 폴더 구조) */}
            <div className="space-y-2">
                <Label htmlFor="categoria" className="text-gray-600">디렉토리</Label>
                <div className="relative">
                    <Input
                        id="categoria"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        placeholder="예: 사용자 관리 > 회원가입 > 약관동의"
                        className="pl-9" 
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                        <Folder className="w-4 h-4" />
                    </div>
                </div>
                {/* Breadcrumb Preview Removed */}
            </div>

            {/* 2. 제목 */}
            <div className="space-y-2">
                <Label htmlFor="titulo">제목 *</Label>
                <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="요청 제목 입력"
                />
            </div>

            {/* 3. 상세 설명 (추가됨) */}
            <div className="space-y-2">
                <Label htmlFor="descricao">기능 상세 설명</Label>
                <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="기능에 대한 상세한 설명을 입력하세요..."
                    className="min-h-[100px]"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="dataTarefa">작업 날짜 *</Label>
                <Input
                    id="dataTarefa"
                    type="date"
                    value={dataTarefa}
                    onChange={(e) => setDataTarefa(e.target.value)}
                    className="bg-white text-[#111111] border-[#007e7a]"
                    style={{ colorScheme: 'light' }}
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="prazoEntrega">마감 기한 *</Label>
                <Input
                    id="prazoEntrega"
                    type="date"
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    className="bg-white text-[#111111] border-[#007e7a]"
                    style={{ colorScheme: 'light' }}
                />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="responsavel">담당자 *</Label>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger id="responsavel">
                    <SelectValue placeholder="담당자 선택" />
                </SelectTrigger>
                <SelectContent>
                    {equipe.map(pessoa => (
                    <SelectItem key={pessoa.PessoaId} value={pessoa.PessoaId}>
                        {pessoa.Nome}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>체크리스트</Label>
                <div className="flex gap-2">
                <Input
                    value={novoItem}
                    onChange={(e) => setNovoItem(e.target.value)}
                    placeholder="체크리스트 항목 추가"
                    onKeyPress={(e) => e.key === 'Enter' && adicionarItemChecklist()}
                />
                <Button
                    type="button"
                    onClick={adicionarItemChecklist}
                    variant="outline"
                    size="icon"
                >
                    <Plus className="w-4 h-4" />
                </Button>
                </div>

                {checklist.length > 0 && (
                <div className="space-y-2 mt-3 border rounded-md p-3">
                    {checklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                        <Checkbox
                        checked={item.Concluido}
                        onCheckedChange={() => toggleItemChecklist(index)}
                        />
                        <span className={`flex-1 ${item.Concluido ? 'line-through text-gray-500' : ''}`}>
                        {item.Item}
                        </span>
                        <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerItemChecklist(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                        <X className="w-4 h-4" />
                        </Button>
                    </div>
                    ))}
                </div>
                )}
            </div>
            </TabsContent>

            <TabsContent value="bugs" className="space-y-4 py-4 min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">이 작업과 관련된 버그</h3>
                    <Button 
                        size="sm" 
                        className="bg-red-600 hover:bg-red-700" 
                        onClick={() => setShowBugReport(true)}
                    >
                        <BugIcon className="w-4 h-4 mr-2" />
                        버그 제보
                    </Button>
                </div>
                
                <Separator className="my-2" />

                <BugList 
                    bugs={demandaEdit?.Bugs} 
                    onSelectBug={setSelectedBug}
                    onOpenArchive={() => setShowBugArchive(true)}
                />

                <BugReportDialog 
                    open={showBugReport} 
                    onClose={() => setShowBugReport(false)}
                    onSubmit={handleReportBug}
                />

                <BugDetailSheet 
                    bug={selectedBug}
                    open={!!selectedBug}
                    onClose={() => setSelectedBug(null)}
                    onUpdateStatus={handleUpdateBugStatus}
                    onAddComment={handleAddComment}
                    currentUser="관리자"
                />

                <BugArchiveDialog
                    open={showBugArchive}
                    onClose={() => setShowBugArchive(false)}
                    bugs={demandaEdit?.Bugs}
                />
            </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancelar}>
            취소
          </Button>
          <Button 
            onClick={handleSalvar}
            className="bg-[#007e7a] hover:bg-[#006662]"
          >
            {demandaEdit ? '수정 저장' : '새 요청 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
