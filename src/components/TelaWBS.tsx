import { useState, useRef, useEffect } from 'react';
import { Demanda } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Trash2, ArrowRight, Save, LayoutDashboard, ChevronRight, ChevronDown, AlignLeft, AlignJustify, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from './ui/utils';
// 이미지 임포트
import sampleImage from 'figma:asset/b82385988d2a57aadbbb229299e4ea1beb6d8928.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface TelaWBSProps {
  equipe: any[];
  onExportarParaKanban: (novasDemandas: Omit<Demanda, 'Id'>[]) => void;
  onVoltar: () => void;
}

// 트리 구조를 표현하기 위한 확장된 행 타입
interface WBSRow {
  id: string;
  level: number; // 0, 1, 2 (Lv1, Lv2, Lv3)
  category: string; // 자동 계산될 수 있음 (상위 레벨의 이름)
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  responsibleId: string;
  startDate: number | null; // 1~31 (편의상 1월 기준)
  endDate: number | null;   // 1~31
  duration: number; // endDate - startDate + 1
  isExpanded: boolean;
}

export function TelaWBS({ equipe, onExportarParaKanban, onVoltar }: TelaWBSProps) {
  const [projectTitle, setProjectTitle] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('1');
  const [showSample, setShowSample] = useState(false);
  
  // 초기 데이터 (샘플과 유사하게)
  const [rows, setRows] = useState<WBSRow[]>([
    { id: '1', level: 0, category: '', title: 'Phase 1', description: '요구사항 분석 및 개발 계획 수립', priority: 'High', responsibleId: '', startDate: 1, endDate: 10, duration: 10, isExpanded: true },
    { id: '2', level: 1, category: '', title: '기획', description: '분석 및 설계', priority: 'High', responsibleId: '', startDate: 1, endDate: 5, duration: 5, isExpanded: true },
    { id: '3', level: 2, category: '', title: '기획자', description: '요구 사항 정의', priority: 'Medium', responsibleId: '', startDate: 1, endDate: 3, duration: 3, isExpanded: true },
  ]);

  // 그리드 스크롤 동기화를 위한 Ref
  const gridHeaderRef = useRef<HTMLDivElement>(null);
  const gridBodyRef = useRef<HTMLDivElement>(null);

  const daysInMonth = 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 행 추가
  const addRow = (targetId?: string, position: 'child' | 'sibling' = 'sibling') => {
    const newRow: WBSRow = {
      id: crypto.randomUUID(),
      level: 0,
      category: '',
      title: '',
      description: '',
      priority: 'Medium',
      responsibleId: '',
      startDate: null,
      endDate: null,
      duration: 0,
      isExpanded: true
    };

    if (!targetId) {
      setRows([...rows, newRow]);
      return;
    }

    const index = rows.findIndex(r => r.id === targetId);
    if (index === -1) return;

    const targetRow = rows[index];
    const newRows = [...rows];

    if (position === 'child') {
      newRow.level = Math.min(targetRow.level + 1, 2); // 최대 3단계 (0, 1, 2)
      newRows.splice(index + 1, 0, newRow);
    } else {
      newRow.level = targetRow.level;
      newRows.splice(index + 1, 0, newRow);
    }

    setRows(newRows);
  };

  // 행 삭제
  const removeRow = (id: string) => {
    if (rows.length <= 1) {
      toast.error('최소 하나의 행은 필요합니다.');
      return;
    }
    setRows(rows.filter(r => r.id !== id));
  };

  // 행 업데이트
  const updateRow = (id: string, updates: Partial<WBSRow>) => {
    setRows(rows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  // 기간 설정 (토글 방식)
  // 클릭한 날짜가 범위 내에 있으면 범위 재설정, 아니면 범위 확장
  const handleCellClick = (rowId: string, day: number) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    let newStart = row.startDate;
    let newEnd = row.endDate;

    if (newStart === null || newEnd === null) {
      // 처음 선택
      newStart = day;
      newEnd = day;
    } else {
      if (day < newStart) {
        newStart = day; // 범위 확장 (앞으로)
      } else if (day > newEnd) {
        newEnd = day; // 범위 확장 (뒤로)
      } else {
        // 범위 내부 클릭: 해당 날짜만 선택되도록 리셋하거나, 시작/끝을 줄이는 등 다양한 UX가 가능.
        // 여기서는 가장 단순하게: 클릭한 지점을 시작점으로 리셋 (새로운 기간 설정 시작)
        // 또는 토글? 범위 선택이 일반적이므로,
        // 이미 선택된 범위 내를 클릭하면 해당 날짜 단일 선택으로 초기화 (재설정 용이)
        newStart = day;
        newEnd = day;
      }
    }

    updateRow(rowId, {
      startDate: newStart,
      endDate: newEnd,
      duration: (newEnd - newStart) + 1
    });
  };
  
  // 뎁스 조절
  const changeLevel = (id: string, delta: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const newLevel = Math.max(0, Math.min(2, row.level + delta));
    updateRow(id, { level: newLevel });
  };

  const handleExport = () => {
    if (!projectTitle.trim()) {
      toast.error('프로젝트 이름을 입력해주세요.');
      return;
    }
    
    const validRows = rows.filter(r => r.title.trim() !== '');
    if (validRows.length === 0) {
      toast.error('변환할 태스크가 없습니다.');
      return;
    }

    const novasDemandas: Omit<Demanda, 'Id'>[] = [];
    
    // 계층 구조 추적을 위한 변수
    let currentLv0Title = '';
    let currentLv1Title = '';

    validRows.forEach(row => {
      // 레벨에 따라 현재 컨텍스트(부모) 업데이트
      if (row.level === 0) {
        currentLv0Title = row.title;
        currentLv1Title = '';
      } else if (row.level === 1) {
        currentLv1Title = row.title;
      }

      // 기간 문자열 생성
      let periodStr = '';
      if (row.startDate && row.endDate) {
        periodStr = ` [일정: ${selectedMonth}월 ${row.startDate}일 ~ ${row.endDate}일 (${row.duration}일)]`;
      }

      // 카테고리 결정 로직: 
      // Lv0(최상위) 항목은 그 자체가 카테고리가 되거나 '기획/관리' 등으로 분류될 수 있음.
      // Lv1, Lv2 항목은 자신의 최상위 부모(Lv0)의 제목을 카테고리로 상속받음.
      let assignedCategory = '';
      if (row.level === 0) {
        assignedCategory = row.title; // 자기 자신이 카테고리명
      } else {
        assignedCategory = currentLv0Title || '미분류';
      }

      // 설명에 계층 경로 포함 (예: 기획 > 화면설계 > 메��페이지)
      let pathPrefix = '';
      if (row.level === 1) pathPrefix = `${currentLv0Title} > `;
      if (row.level === 2) pathPrefix = `${currentLv0Title} > ${currentLv1Title} > `;

      novasDemandas.push({
        Titulo: row.title,
        Descricao: `[WBS] ${pathPrefix}${row.description || row.title}${periodStr}`,
        Projeto: projectTitle,
        Categoria: assignedCategory,
        Prioridade: row.priority,
        ResponsavelId: row.responsibleId || null,
        Status: 'Demandas em Fila',
        DataCriacao: new Date(),
        Checklist: [],
        Bugs: []
      });
    });

    onExportarParaKanban(novasDemandas);
    toast.success(`${novasDemandas.length}개의 태스크가 생성되었습니다.`);
    onVoltar();
  };

  const handleReset = () => {
    if (confirm('작성 중인 모든 내용이 초기화됩니다. 계속하시겠습니까?')) {
        setProjectTitle('');
        setRows([
            { 
                id: crypto.randomUUID(), 
                level: 0, 
                category: '', 
                title: '', 
                description: '', 
                priority: 'Medium', 
                responsibleId: '', 
                startDate: null, 
                endDate: null, 
                duration: 0, 
                isExpanded: true 
            }
        ]);
        toast.success('초기화되었습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onVoltar} size="sm">
            <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
            뒤로
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <h1 className="text-xl font-bold text-gray-900">WBS 작성기</h1>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-gray-500">Project:</span>
            <Input 
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="프로젝트명 입력"
              className="w-[200px] h-8"
            />
          </div>
          <div className="flex items-center gap-2">
             <span className="text-sm text-gray-500">Month:</span>
             <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[80px] h-8">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <SelectItem key={m} value={m.toString()}>{m}월</SelectItem>
                    ))}
                </SelectContent>
             </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSample(!showSample)}
            >
                {showSample ? '샘플 닫기' : '샘플 보기'}
            </Button>
            <Button 
                onClick={handleExport}
                className="bg-[#007e7a] hover:bg-[#006662]"
                size="sm"
            >
                <Save className="w-4 h-4 mr-2" />
                보드에 적용
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                title="초기화"
            >
                <RotateCcw className="w-4 h-4" />
            </Button>
        </div>
      </div>

      {/* Sample Image Viewer */}
      {showSample && (
        <div className="border-b bg-slate-100 p-4 overflow-x-auto">
             <div className="max-w-[1200px] mx-auto bg-white p-2 rounded shadow-sm">
                 <p className="text-xs text-gray-500 mb-2 font-medium">참고용 샘플 이미지 (LG system solution WBS)</p>
                 <ImageWithFallback 
                    src={sampleImage} 
                    alt="WBS Sample" 
                    className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity"
                 />
             </div>
        </div>
      )}

      {/* Main Content Area - Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Task List */}
        <div className="w-[50%] flex flex-col border-r bg-white min-w-[500px]">
          {/* Header */}
          <div className="h-10 bg-gray-100 border-b flex items-center px-4 text-xs font-semibold text-gray-600">
            <div className="w-[40px] text-center">Lv</div>
            <div className="flex-1 px-2">태스크 / 구성요소</div>
            <div className="w-[100px] px-2">담당자</div>
            <div className="w-[50px] text-center">기간</div>
            <div className="w-[80px] text-center">동작</div>
          </div>
          
          {/* List */}
          <div className="flex-1 overflow-y-auto">
             {rows.map((row, idx) => (
                <div 
                    key={row.id} 
                    className={cn(
                        "flex items-center border-b hover:bg-gray-50 transition-colors group h-[40px]",
                        row.level === 0 && "bg-slate-50 font-medium",
                        row.level === 1 && "bg-white",
                    )}
                >
                    {/* Level Control */}
                    <div className="w-[40px] flex justify-center text-xs text-gray-400 gap-0.5">
                        <button onClick={() => changeLevel(row.id, -1)} className="hover:text-blue-600 px-0.5">{"<"}</button>
                        <span className="w-2 text-center">{row.level + 1}</span>
                        <button onClick={() => changeLevel(row.id, 1)} className="hover:text-blue-600 px-0.5">{">"}</button>
                    </div>

                    {/* Title & Description */}
                    <div className="flex-1 px-2 flex items-center gap-2 overflow-hidden">
                        {/* Indentation */}
                        <div style={{ width: `${row.level * 24}px` }} className="flex-shrink-0" />
                        
                        <div className="flex-1 flex flex-col justify-center min-w-0">
                            <input 
                                className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-gray-300"
                                placeholder={row.level === 0 ? "단계/카테고리명" : "작업 제목"}
                                value={row.title}
                                onChange={(e) => updateRow(row.id, { title: e.target.value })}
                            />
                            {/* 상세 설명 (Lv2 이상일 때 혹은 항상 표시?) - 공간 제약상 툴팁 혹은 작게 표시 */}
                            <input 
                                className="w-full bg-transparent border-none p-0 text-[10px] text-gray-400 focus:ring-0 placeholder:text-gray-200"
                                placeholder="상세 설명 입력..."
                                value={row.description}
                                onChange={(e) => updateRow(row.id, { description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Responsible */}
                    <div className="w-[100px] px-2">
                        <Select 
                            value={row.responsibleId} 
                            onValueChange={(val) => updateRow(row.id, { responsibleId: val })}
                        >
                            <SelectTrigger className="h-7 text-xs border-transparent focus:ring-0 bg-transparent p-0">
                                <SelectValue placeholder="미지정" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">미지정</SelectItem>
                                {equipe.map(p => (
                                    <SelectItem key={p.PessoaId} value={p.PessoaId}>{p.Nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Duration Display */}
                    <div className="w-[50px] text-center text-xs text-gray-500">
                        {row.duration > 0 ? `${row.duration}일` : '-'}
                    </div>

                    {/* Actions */}
                    <div className="w-[80px] flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-green-600"
                            onClick={() => addRow(row.id, 'sibling')}
                            title="아래에 행 추가"
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-500"
                            onClick={() => removeRow(row.id)}
                            title="삭제"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
             ))}
             
             {/* Add Row Button at bottom */}
             <div className="p-2">
                 <Button variant="ghost" className="w-full text-gray-400 border-dashed border hover:bg-gray-50" onClick={() => addRow()}>
                    <Plus className="w-4 h-4 mr-2" /> 행 추가
                 </Button>
             </div>
          </div>
        </div>

        {/* Right Panel: Gantt Chart Grid */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Grid Header */}
            <div className="h-10 bg-slate-800 text-white flex border-b border-slate-700 overflow-hidden select-none">
                {days.map(d => (
                    <div key={d} className="flex-1 min-w-[24px] border-r border-slate-600 flex items-center justify-center text-[10px] sm:text-xs">
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-y-auto scrollbar-hide bg-[url('/grid-pattern.png')]">
                {rows.map((row) => {
                    // 범위 내에 있는지 확인하는 헬퍼
                    const isInRange = (day: number) => {
                        if (row.startDate === null || row.endDate === null) return false;
                        return day >= row.startDate && day <= row.endDate;
                    };
                    
                    // 시작점/끝점 스타일링을 위해
                    const isStart = row.startDate === null ? false : (day: number) => day === row.startDate;
                    const isEnd = row.endDate === null ? false : (day: number) => day === row.endDate;

                    return (
                        <div key={row.id} className="h-[40px] flex border-b border-gray-100 hover:bg-gray-50">
                            {days.map(d => (
                                <div 
                                    key={d} 
                                    className={cn(
                                        "flex-1 min-w-[24px] border-r border-dashed border-gray-200 cursor-pointer transition-colors relative group",
                                        // 주말 강조 (토/일 대략 계산: 7일 주기) - 여기선 단순화
                                        // d % 7 === 6 || d % 7 === 0 ? "bg-slate-50" : ""
                                        "hover:bg-blue-50" 
                                    )}
                                    onClick={() => handleCellClick(row.id, d)}
                                    title={`${d}일`}
                                >
                                    {/* Bar Rendering */}
                                    {isInRange(d) && (
                                        <div className={cn(
                                            "absolute top-[8px] bottom-[8px] left-0 right-0 bg-blue-500/80 shadow-sm",
                                            isStart(d) && "left-[2px] rounded-l-md bg-blue-600",
                                            isEnd(d) && "right-[2px] rounded-r-md bg-blue-600",
                                            // 상위 레벨(Phase 등)은 다른 색상
                                            row.level === 0 && "bg-slate-700 top-[4px] bottom-[4px]",
                                        )} />
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
                 {/* Empty space filler */}
                 <div className="h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_23px,#f1f5f9_24px)] pointer-events-none opacity-50"></div>
            </div>
        </div>
      </div>
    </div>
  );
}
