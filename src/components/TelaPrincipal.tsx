import { useState, useMemo, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Demanda, StatusDemanda } from '../types';
import { DemandCard } from './DemandCard';
import { KanbanColumn } from './KanbanColumn';
import { ExcelImporter } from './ExcelImporter';
import { WBSGraph } from './dashboard/WBSGraph';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Card, CardContent } from './ui/card';
import { Plus, Archive, History, Users, Filter, XCircle, BarChart3, ChevronDown, ChevronUp, FileSpreadsheet, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { toast } from 'sonner';

interface TelaPrincipalProps {
  demandas: Demanda[];
  equipe: any[];
  onNovaDemanda: () => void;
  onEditarDemanda: (demanda: Demanda) => void;
  onMoverDemanda: (id: string, novoStatus: StatusDemanda) => void;
  onZerarMes: () => void;
  onAbrirHistorico: () => void;
  onAbrirEquipe: () => void;
  onAbrirWBS: () => void;
  moverDemandaComIndex: (id: string, novoStatus: StatusDemanda, targetId?: string) => void;
  onImportarExcel: (novasDemandas: Omit<Demanda, 'Id'>[]) => void;
  onLimparTudo: () => void;
}

export function TelaPrincipal({
  demandas,
  equipe,
  onNovaDemanda,
  onEditarDemanda,
  onMoverDemanda,
  onZerarMes,
  onAbrirHistorico,
  onAbrirEquipe,
  onAbrirWBS,
  moverDemandaComIndex,
  onImportarExcel,
  onLimparTudo
}: TelaPrincipalProps) {
  // 필터 상태들 (다중 선택 지원)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedResponsibles, setSelectedResponsibles] = useState<string[]>([]);
  
  const [confirmarZerar, setConfirmarZerar] = useState(false);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);

  // 고유값 추출 (필터 옵션용)
  const uniqueProjects = useMemo(() => Array.from(new Set(demandas.map(d => d.Projeto).filter(Boolean))).sort(), [demandas]);
  const uniqueCategories = useMemo(() => Array.from(new Set(demandas.map(d => d.Categoria).filter(Boolean))).sort(), [demandas]);
  const uniquePriorities = ['High', 'Medium', 'Low'];
  
  // 필터 적용 로직
  const demandasFiltradas = useMemo(() => {
    return demandas.filter(d => {
      // 프로젝트 필터
      if (selectedProjects.length > 0 && !selectedProjects.includes(d.Projeto)) return false;
      
      // 카테고리 필터
      if (selectedCategories.length > 0) {
        if (!d.Categoria || !selectedCategories.includes(d.Categoria)) return false;
      }
      
      // 우선순위 필터
      if (selectedPriorities.length > 0) {
        if (!d.Prioridade || !selectedPriorities.includes(d.Prioridade)) return false;
      }
      
      // 담당자 필터
      if (selectedResponsibles.length > 0 && !selectedResponsibles.includes(d.ResponsavelId)) return false;
      
      return true;
    });
  }, [demandas, selectedProjects, selectedCategories, selectedPriorities, selectedResponsibles]);

  // 각 상태별 카드 분리
  const demandasPorStatus = useMemo(() => {
    return {
      fila: demandasFiltradas.filter(d => d.Status === 'Demandas em Fila'),
      pendentes: demandasFiltradas.filter(d => d.Status === 'Demandas Pendentes'),
      resolvidas: demandasFiltradas.filter(d => d.Status === 'Demandas Resolvidas'),
    };
  }, [demandasFiltradas]);

  // 필터 토글 헬퍼 함수
  const toggleFilter = (list: string[], item: string, setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // 필터 초기화
  const clearFilters = () => {
    setSelectedProjects([]);
    setSelectedCategories([]);
    setSelectedPriorities([]);
    setSelectedResponsibles([]);
  };

  // 활성 필터 개수
  const activeFilterCount = selectedProjects.length + selectedCategories.length + selectedPriorities.length + selectedResponsibles.length;

  const handleZerarMes = () => {
    onZerarMes();
    setConfirmarZerar(false);
  };

  const handleLimparTudo = () => {
    onLimparTudo();
    setConfirmarLimpar(false);
  };

  const handleMoverFila = (id: string) => {
    onMoverDemanda(id, 'Demandas em Fila');
    toast.success('요청이 대기로 이동되었습니다');
  };

  const handleMoverPendentes = (id: string) => {
    onMoverDemanda(id, 'Demandas Pendentes');
    toast.success('요청이 진행 중으로 이동되었습니다');
  };

  const handleConcluir = (id: string) => {
    onMoverDemanda(id, 'Demandas Resolvidas');
    toast.success('요청이 완료되었습니다!');
  };

  const handleDrop = (id: string, novoStatus: StatusDemanda) => {
    moverDemandaComIndex(id, novoStatus);
    const demanda = demandas.find(d => d.Id === id);
    if (demanda && demanda.Status !== novoStatus) {
       const mensagens = {
        'Demandas em Fila': '요청이 대기로 이동되었습니다',
        'Demandas Pendentes': '요청이 진행 중으로 이동되었습니다',
        'Demandas Resolvidas': '요청이 완료되었습니다!',
      };
      toast.success(mensagens[novoStatus]);
    }
  };

  const handleMoveCard = useCallback((draggedId: string, targetId: string) => {
    const demanda = demandas.find(d => d.Id === draggedId);
    if (demanda) {
        moverDemandaComIndex(draggedId, demanda.Status, targetId);
    }
  }, [demandas, moverDemandaComIndex]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-white to-[#007e7a] p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h1 className="text-gray-900 text-2xl font-bold">WBS 작업 관리 시스템</h1>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onNovaDemanda} className="bg-[#007e7a] hover:bg-[#006662]">
                  <Plus className="w-4 h-4 mr-2" />
                  새 요청
                </Button>
                
                <ExcelImporter onImport={onImportarExcel} />

                <Button variant="outline" onClick={onAbrirWBS} className="bg-white hover:bg-green-50 text-green-700 border-green-200">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  WBS 작성
                </Button>

                <Button variant="outline" onClick={onAbrirEquipe} className="bg-white">
                  <Users className="w-4 h-4 mr-2" />
                  팀
                </Button>
                <Button variant="outline" onClick={onAbrirHistorico} className="bg-white">
                  <History className="w-4 h-4 mr-2" />
                  기록
                </Button>
                <Button variant="outline" onClick={() => setConfirmarZerar(true)} className="bg-white">
                  <Archive className="w-4 h-4 mr-2" />
                  이번 달 초기화
                </Button>
                <Button variant="outline" onClick={() => setConfirmarLimpar(true)} className="bg-white text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  전체 초기화
                </Button>
              </div>
            </div>

            {/* WBS Graph Collapsible */}
            <div className="mb-4">
              <Collapsible
                  open={isGraphOpen}
                  onOpenChange={setIsGraphOpen}
                  className="space-y-2"
              >
                  <div className="flex items-center justify-between px-1">
                      <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          프로젝트 현황
                      </h2>
                      <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-auto h-8 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full">
                              {isGraphOpen ? (
                                  <>
                                      <span className="mr-2 text-xs">접기</span>
                                      <ChevronUp className="h-4 w-4" />
                                  </>
                              ) : (
                                  <>
                                      <span className="mr-2 text-xs">펼치기</span>
                                      <ChevronDown className="h-4 w-4" />
                                  </>
                              )}
                          </Button>
                      </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="space-y-2">
                      <Card className="bg-white/95 border-none shadow-sm animate-in slide-in-from-top-2 duration-300">
                          <CardContent className="p-6">
                              <WBSGraph demandas={demandas} />
                          </CardContent>
                      </Card>
                  </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 강화된 필터 바 */}
            <Card className="bg-white/95 border-none shadow-sm">
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 border-dashed flex items-center gap-2 text-sm font-normal">
                      <Filter className="w-4 h-4" />
                      필터
                      {activeFilterCount > 0 && (
                        <>
                          <Separator orientation="vertical" className="mx-1 h-4" />
                          <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                            {activeFilterCount}
                          </Badge>
                          <div className="hidden space-x-1 lg:flex">
                             {activeFilterCount > 3 ? (
                                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                  {activeFilterCount}개 선택됨
                                </Badge>
                             ) : (
                                <>
                                   {selectedProjects.length > 0 && <Badge variant="secondary" className="rounded-sm px-1 font-normal">프로젝트</Badge>}
                                   {selectedCategories.length > 0 && <Badge variant="secondary" className="rounded-sm px-1 font-normal">카테고리</Badge>}
                                   {selectedResponsibles.length > 0 && <Badge variant="secondary" className="rounded-sm px-1 font-normal">담당자</Badge>}
                                   {selectedPriorities.length > 0 && <Badge variant="secondary" className="rounded-sm px-1 font-normal">우선순위</Badge>}
                                </>
                             )}
                          </div>
                        </>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                         <h4 className="font-medium leading-none">필터 옵션</h4>
                         {activeFilterCount > 0 && (
                            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary" onClick={clearFilters}>
                               초기화
                            </Button>
                         )}
                      </div>
                      <Separator />
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-5">
                          {/* 프로젝트 */}
                          <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground">프로젝트</Label>
                            {uniqueProjects.map(project => (
                              <div key={project} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`proj-${project}`} 
                                  checked={selectedProjects.includes(project)}
                                  onCheckedChange={() => toggleFilter(selectedProjects, project, setSelectedProjects)}
                                />
                                <Label htmlFor={`proj-${project}`} className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                  {project}
                                </Label>
                              </div>
                            ))}
                          </div>

                          {/* 카테고리 */}
                          {uniqueCategories.length > 0 && (
                             <div className="space-y-3">
                                <Label className="text-xs font-semibold text-muted-foreground">카테고리</Label>
                                {uniqueCategories.map(cat => (
                                <div key={cat} className="flex items-center space-x-2">
                                    <Checkbox 
                                    id={`cat-${cat}`} 
                                    checked={selectedCategories.includes(cat)}
                                    onCheckedChange={() => toggleFilter(selectedCategories, cat, setSelectedCategories)}
                                    />
                                    <Label htmlFor={`cat-${cat}`} className="text-sm font-normal leading-none cursor-pointer">
                                    {cat}
                                    </Label>
                                </div>
                                ))}
                             </div>
                          )}
                          
                          {/* 우선순위 */}
                          <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground">우선순위</Label>
                            {uniquePriorities.map(prio => (
                              <div key={prio} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`prio-${prio}`} 
                                  checked={selectedPriorities.includes(prio)}
                                  onCheckedChange={() => toggleFilter(selectedPriorities, prio, setSelectedPriorities)}
                                />
                                <Label htmlFor={`prio-${prio}`} className="text-sm font-normal leading-none cursor-pointer">
                                  {prio}
                                </Label>
                              </div>
                            ))}
                          </div>

                          {/* 담당자 */}
                          <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground">담당자</Label>
                            {equipe.map(pessoa => (
                              <div key={pessoa.PessoaId} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`resp-${pessoa.PessoaId}`} 
                                  checked={selectedResponsibles.includes(pessoa.PessoaId)}
                                  onCheckedChange={() => toggleFilter(selectedResponsibles, pessoa.PessoaId, setSelectedResponsibles)}
                                />
                                <Label htmlFor={`resp-${pessoa.PessoaId}`} className="text-sm font-normal leading-none cursor-pointer">
                                  {pessoa.Nome}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 활성 필터 뱃지들 (직관적 해제용) */}
                <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    {selectedProjects.map(p => (
                        <Badge key={p} variant="secondary" className="h-7 px-2 flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                            {p}
                            <XCircle className="w-3 h-3 cursor-pointer" onClick={() => toggleFilter(selectedProjects, p, setSelectedProjects)} />
                        </Badge>
                    ))}
                    {selectedCategories.map(c => (
                        <Badge key={c} variant="secondary" className="h-7 px-2 flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200">
                            {c}
                            <XCircle className="w-3 h-3 cursor-pointer" onClick={() => toggleFilter(selectedCategories, c, setSelectedCategories)} />
                        </Badge>
                    ))}
                    {selectedPriorities.map(p => (
                        <Badge key={p} variant="secondary" className="h-7 px-2 flex items-center gap-1 bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200">
                            {p}
                            <XCircle className="w-3 h-3 cursor-pointer" onClick={() => toggleFilter(selectedPriorities, p, setSelectedPriorities)} />
                        </Badge>
                    ))}
                     {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearFilters}>
                            전체 해제
                        </Button>
                     )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KanbanColumn
              status="Demandas em Fila"
              title="대기"
              count={demandasPorStatus.fila.length}
              onDrop={handleDrop}
            >
              {demandasPorStatus.fila.map(demanda => (
                <DemandCard
                  key={demanda.Id}
                  demanda={demanda}
                  onMoverFila={handleMoverFila}
                  onMoverPendentes={handleMoverPendentes}
                  onConcluir={handleConcluir}
                  onEditar={onEditarDemanda}
                  moveCard={handleMoveCard}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn
              status="Demandas Pendentes"
              title="진행 중"
              count={demandasPorStatus.pendentes.length}
              onDrop={handleDrop}
            >
              {demandasPorStatus.pendentes.map(demanda => (
                <DemandCard
                  key={demanda.Id}
                  demanda={demanda}
                  onMoverFila={handleMoverFila}
                  onMoverPendentes={handleMoverPendentes}
                  onConcluir={handleConcluir}
                  onEditar={onEditarDemanda}
                  moveCard={handleMoveCard}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn
              status="Demandas Resolvidas"
              title="완료"
              count={demandasPorStatus.resolvidas.length}
              onDrop={handleDrop}
            >
              {demandasPorStatus.resolvidas.map(demanda => (
                <DemandCard
                  key={demanda.Id}
                  demanda={demanda}
                  onMoverFila={handleMoverFila}
                  onMoverPendentes={handleMoverPendentes}
                  onConcluir={handleConcluir}
                  onEditar={onEditarDemanda}
                  moveCard={handleMoveCard}
                />
              ))}
            </KanbanColumn>
          </div>
        </div>

        {/* Dialog de confirmação para zerar mês */}
        <AlertDialog open={confirmarZerar} onOpenChange={setConfirmarZerar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>아카이브 확인</AlertDialogTitle>
              <AlertDialogDescription>
                이 작업은 완료된 모든 요청을 기록으로 이동하고 보드에서 제거합니다. 계속하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleZerarMes}
                className="bg-[#007e7a] hover:bg-[#006662]"
              >
                확인
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de confirmação para limpar tudo */}
        <AlertDialog open={confirmarLimpar} onOpenChange={setConfirmarLimpar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">전체 초기화 경고</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-bold text-red-600">주의: 이 작업은 되돌릴 수 없습니다.</span>
                <br />
                현재 보드에 있는 <span className="font-bold">모든 요청이 영구적으로 삭제</span>됩니다.
                <br />
                (아카이브된 기록은 유지됩니다)
                <br />
                정말로 초기화하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLimparTudo}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                삭제 및 초기화
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DndProvider>
  );
}
