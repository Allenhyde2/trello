import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Demanda } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Calendar, Clock, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, CheckCheck, FileText, Info, Bug } from 'lucide-react';

interface DemandCardProps {
  demanda: Demanda;
  onMoverFila: (id: string) => void;
  onMoverPendentes: (id: string) => void;
  onConcluir: (id: string) => void;
  onEditar: (demanda: Demanda) => void;
  moveCard: (draggedId: string, targetId: string) => void;
}

export function DemandCard({ 
  demanda, 
  onMoverFila, 
  onMoverPendentes, 
  onConcluir, 
  onEditar,
  moveCard 
}: DemandCardProps) {
  // Drop target ref (전체 영역, 마진 포함)
  const ref = useRef<HTMLDivElement>(null);
  // Drag source ref (카드 본체)
  const dragRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'DEMAND_CARD',
    item: { id: demanda.Id, status: demanda.Status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'DEMAND_CARD',
    hover(item: { id: string; status: string }) {
      if (!ref.current) return;
      
      const draggedId = item.id;
      const targetId = demanda.Id;

      if (draggedId === targetId) return;

      // 같은 컬럼(Status) 내에서만 호버 이동 처리
      if (item.status === demanda.Status) {
        moveCard(draggedId, targetId);
      }
    },
  });

  // 호버 감지 영역은 바깥 div
  drop(ref);
  // 드래그 시작 및 프리뷰 이미지는 Card 컴포넌트 직접 연결
  drag(preview(dragRef));

  // Calcular progresso do checklist
  const totalItens = demanda.Checklist.length;
  const itensConcluidos = demanda.Checklist.filter(item => item.Concluido).length;
  const progresso = totalItens > 0 ? (itensConcluidos / totalItens) * 100 : 0;

  // Calcular status do prazo
  const calcularStatusPrazo = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prazo = new Date(demanda.PrazoEntrega);
    prazo.setHours(0, 0, 0, 0);
    
    const diffTime = prazo.getTime() - hoje.getTime();
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (dias < 0) {
      return { tipo: 'atrasado', mensagem: `지연 (${Math.abs(dias)}일)`, cor: 'text-red-600' };
    } else if (dias === 0) {
      return { tipo: 'hoje', mensagem: '오늘 마감', cor: 'text-orange-600' };
    } else if (dias === 1) {
      return { tipo: 'amanha', mensagem: '내일 마감', cor: 'text-yellow-600' };
    } else if (dias <= 2) {
      return { tipo: 'urgente', mensagem: `${dias}일 후 마감`, cor: 'text-yellow-600' };
    }
    return { tipo: 'normal', mensagem: `${dias}일 후 마감`, cor: 'text-gray-600' };
  };

  const statusPrazo = calcularStatusPrazo();

  // Prioridade Style
  const getPriorityColor = (prio?: string) => {
      switch(prio) {
          case 'High': return 'bg-red-100 text-red-800 border-red-200';
          case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'Low': return 'bg-green-100 text-green-800 border-green-200';
          default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
  };

  // 버그 카운트 (해결되지 않은 버그)
  const activeBugCount = demanda.Bugs?.filter(b => b.Status !== 'Resolved').length || 0;

  return (
    <div 
      ref={ref} 
      className="mb-3 w-full"
    >
      <Card 
        ref={dragRef}
        className="hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing bg-white group relative" 
        onClick={() => onEditar(demanda)}
        style={{ 
          opacity: isDragging ? 0.4 : 1,
          transform: 'translate3d(0, 0, 0)'
        }}
      >
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="flex items-start justify-between gap-2 text-base">
            <div className="flex flex-col gap-1 w-full">
                {/* 메타데이터 (프로젝트, 우선순위) */}
                <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-gray-500 border-gray-200">
                        {demanda.Projeto}
                    </Badge>
                    {demanda.Prioridade && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${getPriorityColor(demanda.Prioridade)}`}>
                            {demanda.Prioridade}
                        </Badge>
                    )}
                </div>
                
                {/* 타이틀 및 상세 정보 아이콘 */}
                <div className="flex items-start justify-between w-full">
                    <span className="font-semibold leading-tight">{demanda.Titulo}</span>
                    <div className="flex flex-col items-end gap-1">
                        {demanda.Status === 'Demandas Resolvidas' && (
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                    </div>
                </div>
            </div>
          </CardTitle>
          
          {/* 카테고리 (WBS Depth) */}
          {demanda.Categoria && (
             <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{demanda.Categoria}</span>
             </div>
          )}

        </CardHeader>
        <CardContent className="space-y-3 pb-4 px-4">
            
          {/* 설명 (Tooltip or Text) */}
          {demanda.Descricao && (
              <p className="text-xs text-gray-500 line-clamp-2 bg-slate-50 p-2 rounded-md">
                  {demanda.Descricao}
              </p>
          )}

          {/* Informações de data */}
          <div className="space-y-1 text-xs">
            <div className={`flex items-center gap-2 font-medium ${statusPrazo.cor}`}>
              {statusPrazo.tipo === 'atrasado' ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              <span>
                {new Date(demanda.PrazoEntrega).toLocaleDateString('ko-KR')}
                {statusPrazo.tipo !== 'normal' && ` • ${statusPrazo.mensagem}`}
              </span>
            </div>
          </div>

          {/* Progresso do checklist */}
          {totalItens > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">진행률</span>
                <span className="text-gray-700 font-medium">{Math.round(progresso)}%</span>
              </div>
              <Progress value={progresso} className="h-1.5" />
            </div>
          )}

          {/* Responsável & Actions */}
          <div className="flex items-center justify-between pt-1">
             <div className="text-xs text-gray-600 flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    {demanda.ResponsavelNome.charAt(0)}
                </div>
                <span>{demanda.ResponsavelNome}</span>
             </div>

             {/* Hover 시에만 보이는 액션 버튼들 (모바일에선 항상 보이게 처리 필요하나 일단 간소화) */}
             <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {demanda.Status !== 'Demandas em Fila' && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onMoverFila(demanda.Id); }}>
                    <ArrowLeft className="w-3 h-3" />
                </Button>
                )}
                {demanda.Status !== 'Demandas Pendentes' && demanda.Status !== 'Demandas Resolvidas' && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onMoverPendentes(demanda.Id); }}>
                    <ArrowRight className="w-3 h-3" />
                </Button>
                )}
                {demanda.Status !== 'Demandas Resolvidas' && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); onConcluir(demanda.Id); }}>
                    <CheckCheck className="w-3 h-3" />
                </Button>
                )}
             </div>
          </div>
        </CardContent>

        {/* 버그 인디케이터 (우측 하단) */}
        {activeBugCount > 0 && (
            <div className="absolute bottom-2 right-2 bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 border border-red-200 shadow-sm z-10">
                <Bug className="w-3 h-3" />
                <span>{activeBugCount}</span>
            </div>
        )}
      </Card>
    </div>
  );
}
