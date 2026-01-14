import { useState, useRef, useEffect } from 'react';
import { Demanda } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Trash2, ArrowRight, Save, LayoutDashboard, ChevronRight, ChevronDown, AlignLeft, AlignJustify, RotateCcw, Folder, FolderOpen, FileText, CornerDownRight, Indent, Outdent, MoreHorizontal, Layers } from 'lucide-react';
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
  level: number; // 0, 1, 2, 3 (Lv1, Lv2, Lv3, Lv4)
  category: string; // 자동 계산될 수 있음 (상위 레벨의 이름)
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  responsibleId: string;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;   // YYYY-MM-DD
  duration: number; // 일수
  isExpanded: boolean;
  createCard: boolean;
}

export function TelaWBS({ equipe, onExportarParaKanban, onVoltar }: TelaWBSProps) {
  const [projectTitle, setProjectTitle] = useState('');
  const [startMonth, setStartMonth] = useState('1');
  const [endMonth, setEndMonth] = useState('3');
  const [showSample, setShowSample] = useState(false);
  const currentYear = 2026;
  
  // 초기 데이터 (날짜 형식 변경 YYYY-MM-DD)
  const [rows, setRows] = useState<WBSRow[]>([
    { id: '1', level: 0, category: '', title: 'Phase 1', description: '요구사항 분석 및 개발 계획 수립', priority: 'High', responsibleId: '', startDate: `${currentYear}-01-01`, endDate: `${currentYear}-01-10`, duration: 10, isExpanded: true, createCard: true },
    { id: '2', level: 1, category: '', title: '기획', description: '분석 및 설계', priority: 'High', responsibleId: '', startDate: `${currentYear}-01-01`, endDate: `${currentYear}-01-05`, duration: 5, isExpanded: true, createCard: true },
    { id: '3', level: 2, category: '', title: '기획자', description: '요구 사항 정의', priority: 'Medium', responsibleId: '', startDate: `${currentYear}-01-01`, endDate: `${currentYear}-01-03`, duration: 3, isExpanded: true, createCard: true },
  ]);

  // 그리드 스크롤 동기화를 위한 Ref

  const gridHeaderRef = useRef<HTMLDivElement>(null);
  const gridBodyRef = useRef<HTMLDivElement>(null);

  // 날짜 데이터 생성 로직 (다중 월 지원)
  const days = [];
  const startM = parseInt(startMonth);
  const endM = parseInt(endMonth);

  // 월 루프
  for (let m = startM; m <= endM; m++) {
    const daysInThisMonth = new Date(currentYear, m, 0).getDate();
    for (let d = 1; d <= daysInThisMonth; d++) {
        const date = new Date(currentYear, m - 1, d);
        // 날짜 문자열 생성 (로컬 시간대 이슈 방지를 위해 직접 포맷팅)
        const dateStr = `${currentYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = date.getDay();
        days.push({
            date,
            dateStr,
            month: m,
            day: d,
            dayOfWeek,
            dayName: ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek]
        });
    }
  }

  // 헤더 그룹핑 데이터 생성
  // 1. 월별 그룹핑
  const monthGroups = [];
  let currentMonth = -1;
  let currentMonthDays = [];
  
  for (const dayObj of days) {
      if (dayObj.month !== currentMonth) {
          if (currentMonth !== -1) {
              monthGroups.push({ month: currentMonth, days: [...currentMonthDays] });
          }
          currentMonth = dayObj.month;
          currentMonthDays = [];
      }
      currentMonthDays.push(dayObj);
  }
  if (currentMonthDays.length > 0) monthGroups.push({ month: currentMonth, days: [...currentMonthDays] });

  // 2. 주차별 그룹핑 (헤더용)
  const weeks = [];
  let currentWeekDays = [];
  let weekCounter = 1;
  
  for (let i = 0; i < days.length; i++) {
      const dayObj = days[i];
      currentWeekDays.push(dayObj);
      
      const isLastDayOfMonth = dayObj.day === new Date(currentYear, dayObj.month, 0).getDate();
      // 토요일이거나, 월의 마지막이거나, 전체의 마지막이면 주 마감
      if (dayObj.dayOfWeek === 6 || isLastDayOfMonth || i === days.length - 1) {
          weeks.push({ id: weekCounter, days: [...currentWeekDays] });
          currentWeekDays = [];
          if (dayObj.dayOfWeek === 6) weekCounter++;
      }
  }

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
      isExpanded: true,
      createCard: true
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
      newRow.level = Math.min(targetRow.level + 1, 3); // 최대 4단계 (0, 1, 2, 3)
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
    // 일반 업데이트는 updateRowAndRecalculate를 사용하도록 변경 유도
    // 여기서는 단순 호환성을 위해 남겨두거나, 내부적으로 호출
    updateRowAndRecalculate(id, updates);
  };

  // 기간 설정 (토글 방식)
  // 클릭한 날짜가 범위 내에 있으면 범위 재설정, 아니면 범위 확장
  const handleCellClick = (rowId: string, dayDateStr: string) => {
    const rowIndex = rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) return;
    const row = rows[rowIndex];

    // 조건 1: 카드 생성이 체크되지 않은 항목은 설정 불가
    if (!row.createCard) return;

    // 조건 2: 자식이 있는 상위 디렉토리는 직접 설정 불가 (자동 계산됨)
    const hasChild = rowIndex < rows.length - 1 && rows[rowIndex + 1].level > row.level;
    if (hasChild) return; 

    let newStart = row.startDate;
    let newEnd = row.endDate;

    if (newStart === null || newEnd === null) {
      // 1. 아무것도 선택 안된 상태: 클릭한 날짜 선택
      newStart = dayDateStr;
      newEnd = dayDateStr;
    } else {
      // 2. 이미 선택된 상태
      const isSingleSelection = newStart === newEnd;
      
      if (isSingleSelection && newStart === dayDateStr) {
        // 2-1. 단일 날짜이고, 같은 날짜 클릭 -> 취소
        newStart = null;
        newEnd = null;
      } else {
        // 문자열 비교 (YYYY-MM-DD는 문자열 비교 가능)
        if (dayDateStr < newStart) {
          newStart = dayDateStr; // 앞으로 확장
        } else if (dayDateStr > newEnd) {
          newEnd = dayDateStr; // 뒤로 확장
        } else {
          // 범위 내부 클릭 or 다른 날짜 클릭 -> 해당 날짜로 단일 선택 재설정
          newStart = dayDateStr;
          newEnd = dayDateStr;
        }
      }
    }

    // Duration 계산 (일수 차이)
    let newDuration = 0;
    if (newStart !== null && newEnd !== null) {
        const start = new Date(newStart);
        const end = new Date(newEnd);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        newDuration = diffDays + 1; // 시작일 포함
    }

    updateRowAndRecalculate(rowId, {
      startDate: newStart,
      endDate: newEnd,
      duration: newDuration
    });
  };
  
  // 뎁스 조절
  const changeLevel = (id: string, delta: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const newLevel = Math.max(0, Math.min(3, row.level + delta));
    
    // 상태 업데이트 후 부모 날짜 재계산
    const newRows = rows.map(r => r.id === id ? { ...r, level: newLevel } : r);
    setRows(recalculateParentDates(newRows));
  };

  // 헬퍼: 특정 인덱스의 행이 자식(더 깊은 레벨)을 가지고 있는지 확인
  const hasChildren = (allRows: WBSRow[], index: number) => {
    const parent = allRows[index];
    if (index >= allRows.length - 1) return false;
    return allRows[index + 1].level > parent.level;
  };

  // 헬퍼: 부모의 날짜를 재귀적으로 계산하는 함수 (Bottom-up 방식)
  const recalculateParentDates = (currentRows: WBSRow[]): WBSRow[] => {
    const newRows = [...currentRows];
    
    // 역순으로 순회 (자식부터 부모로)
    for (let i = newRows.length - 1; i >= 0; i--) {
        const row = newRows[i];
        
        let childIndices: number[] = [];
        for (let j = i + 1; j < newRows.length; j++) {
            if (newRows[j].level <= row.level) break;
            if (newRows[j].level === row.level + 1) {
                childIndices.push(j);
            }
        }

        if (childIndices.length > 0) {
            // 날짜 문자열 비교를 위해 초기값 설정
            let minStart = '9999-12-31';
            let maxEnd = '0000-01-01';
            let hasValidChild = false;

            childIndices.forEach(childIdx => {
                const child = newRows[childIdx];
                if (child.startDate && child.endDate) {
                    if (child.startDate < minStart) minStart = child.startDate;
                    if (child.endDate > maxEnd) maxEnd = child.endDate;
                    hasValidChild = true;
                }
            });

            if (hasValidChild) {
                // Duration 재계산
                const start = new Date(minStart);
                const end = new Date(maxEnd);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                newRows[i] = {
                    ...newRows[i],
                    startDate: minStart,
                    endDate: maxEnd,
                    duration: diffDays
                };
            } else {
                 newRows[i] = {
                    ...newRows[i],
                    startDate: null,
                    endDate: null,
                    duration: 0
                };
            }
        }
    }
    return newRows;
  };

  // 행 업데이트 및 부모 날짜 재계산 래퍼
  const updateRowAndRecalculate = (id: string, updates: Partial<WBSRow>) => {
    const updatedRows = rows.map(r => r.id === id ? { ...r, ...updates } : r);
    setRows(recalculateParentDates(updatedRows));
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
    let currentLv2Title = '';

    validRows.forEach(row => {
      // 레벨에 따라 현재 컨텍스트(부모) 업데이트
      if (row.level === 0) {
        currentLv0Title = row.title;
        currentLv1Title = '';
        currentLv2Title = '';
      } else if (row.level === 1) {
        currentLv1Title = row.title;
        currentLv2Title = '';
      } else if (row.level === 2) {
        currentLv2Title = row.title;
      }

      // 카드 생성 체크가 해제된 경우 스킵 (단, 계층 구조 컨텍스트는 업데이트 해야 하므로 컨텍스트 업데이트 로직 뒤에 배치)
      if (!row.createCard) {
        return;
      }

      // 기간 문자열 생성
      let periodStr = '';
      if (row.startDate && row.endDate) {
        periodStr = ` [일정: ${row.startDate} ~ ${row.endDate} (${row.duration}일)]`;
      }

      // 카테고리 결정 로직: 부모 경로(Ancestors Path)를 사용
      let assignedCategory = '';
      if (row.level === 0) {
        assignedCategory = ''; 
      } else if (row.level === 1) {
        assignedCategory = currentLv0Title;
      } else if (row.level === 2) {
        assignedCategory = `${currentLv0Title} > ${currentLv1Title}`;
      } else if (row.level === 3) {
        assignedCategory = `${currentLv0Title} > ${currentLv1Title} > ${currentLv2Title}`;
      }

      novasDemandas.push({
        Titulo: row.title,
        Descricao: `[WBS] ${row.description || row.title}${periodStr}`,
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
                isExpanded: true,
                createCard: true
            }
        ]);
        toast.success('초기화되었습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar Area */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        {/* Row 1: Project Title (Top Most) */}
        <div className="px-6 py-3 border-b border-gray-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Name</span>
                <Input 
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="프로젝트명을 입력하세요 (예: 차세대 쇼핑몰 구축)"
                    className="flex-1 h-9 text-lg font-semibold bg-transparent border-transparent hover:bg-white focus:bg-white focus:border-gray-200 transition-all px-2"
                />
            </div>
        </div>

        {/* Row 2: Toolbar & Controls */}
        <div className="px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onVoltar} size="sm" className="text-gray-600">
                <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
                뒤로
            </Button>
            <div className="h-4 w-px bg-gray-300" />
            <span className="font-semibold text-gray-700">WBS 작성기</span>
            
            <div className="flex items-center gap-2 ml-4 bg-gray-100 rounded-md px-2 py-1">
                <span className="text-xs text-gray-500 font-medium">기간 설정:</span>
                <div className="flex items-center gap-1">
                    <Select value={startMonth} onValueChange={setStartMonth}>
                        <SelectTrigger className="w-[70px] h-7 text-xs border-none bg-transparent focus:ring-0 shadow-none p-0 gap-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                <SelectItem key={m} value={m.toString()}>{m}월</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-xs text-gray-400">~</span>
                    <Select value={endMonth} onValueChange={(val) => {
                        // 종료월은 시작월보다 작을 수 없음
                        if (parseInt(val) < parseInt(startMonth)) {
                            toast.error('종료월은 시작월보다 빨라야 합니다.');
                            return;
                        }
                        setEndMonth(val);
                    }}>
                        <SelectTrigger className="w-[70px] h-7 text-xs border-none bg-transparent focus:ring-0 shadow-none p-0 gap-1">
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
            </div>

            <div className="flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowSample(!showSample)}
                    className="text-gray-500"
                >
                    {showSample ? '샘플 닫기' : '샘플 보기'}
                </Button>
                <Button 
                    onClick={handleExport}
                    className="bg-[#007e7a] hover:bg-[#006662] shadow-sm"
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
          {/* Header - 오른쪽 그리드 헤더 높이(76px)와 동일하게 맞춤 */}
          <div className="h-[76px] bg-gray-100 border-b flex items-center px-4 text-xs font-semibold text-gray-600 select-none">
            <div className="flex-1 px-2 pl-6">디렉토리 구조</div>
            <div className="w-[60px] text-center" title="체크 시 칸반 카드로 생성됩니다">카드생성</div>
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
                        "flex items-center border-b hover:bg-blue-50/50 transition-colors group h-[56px] relative", 
                        // 레벨에 따른 배경색 미세 조정 (선택적)
                        row.level === 0 && "bg-slate-50/30",
                    )}
                >
                    {/* Indentation Guidelines (Visual Only) */}
                    <div className="absolute left-0 top-0 bottom-0 flex pointer-events-none">
                        {Array.from({ length: row.level }).map((_, i) => (
                            <div key={i} className="w-[20px] border-r border-gray-100/50 h-full" />
                        ))}
                    </div>

                    {/* Title & Description (Tree View) */}
                    <div className="flex-1 px-2 flex items-center overflow-hidden py-1 pl-2">
                        {/* Indent Spacer & Connector */}
                        <div style={{ paddingLeft: `${row.level * 20}px` }} className="flex-shrink-0 transition-all duration-200" />
                        
                        {/* Icon & Toggle */}
                        <div className="relative flex items-center gap-1.5 mr-2 flex-shrink-0 text-gray-400 group/icon">
                             {/* Level Control Buttons (Hover only) - Repositioned to not overlap with text */}
                             <div className="absolute -left-[52px] top-1/2 -translate-y-1/2 flex items-center bg-white shadow-sm border border-gray-200 rounded-md p-0.5 opacity-0 group-hover/icon:opacity-100 transition-opacity z-20">
                                <Button 
                                    variant="ghost" size="icon" className="h-5 w-5 hover:bg-slate-100 hover:text-blue-600"
                                    onClick={() => changeLevel(row.id, -1)}
                                    title="상위 폴더로 이동 (Outdent)"
                                    disabled={row.level === 0}
                                >
                                    <Outdent className="w-3 h-3" />
                                </Button>
                                <Button 
                                    variant="ghost" size="icon" className="h-5 w-5 hover:bg-slate-100 hover:text-blue-600"
                                    onClick={() => changeLevel(row.id, 1)}
                                    title="하위 폴더로 이동 (Indent)"
                                    disabled={row.level >= 3}
                                >
                                    <Indent className="w-3 h-3" />
                                </Button>
                             </div>

                             {row.level < 3 ? (
                                 <FolderOpen className={cn("w-4 h-4", row.level === 0 ? "text-blue-600 fill-blue-100" : "text-slate-500 fill-slate-50")} />
                             ) : (
                                 <FileText className="w-4 h-4 text-gray-400" />
                             )}
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center min-w-0 gap-0.5">
                            <input 
                                className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-gray-300 transition-colors font-medium text-gray-700"
                                placeholder={row.level === 0 ? "최상위 폴더명" : "폴더/태스크 이름"}
                                value={row.title}
                                onChange={(e) => updateRow(row.id, { title: e.target.value })}
                            />
                            {/* 상세 설명 칸 (작게) */}
                            <input 
                                className="w-full bg-transparent p-0 text-[11px] text-gray-400 focus:text-gray-600 focus:bg-white/50 rounded focus:ring-0 placeholder:text-gray-200 border-none h-4"
                                placeholder="상세 설명..."
                                value={row.description}
                                onChange={(e) => updateRow(row.id, { description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Create Card Checkbox */}
                    <div className="w-[60px] flex justify-center items-center">
                        <Checkbox 
                            checked={row.createCard}
                            onCheckedChange={(checked) => {
                                // 체크 해제 시 날짜 정보 초기화 (설정 불가 상태로 만들기 위해)
                                const isChecked = checked as boolean;
                                const updates: Partial<WBSRow> = { createCard: isChecked };
                                if (!isChecked) {
                                    updates.startDate = null;
                                    updates.endDate = null;
                                    updates.duration = 0;
                                }
                                updateRowAndRecalculate(row.id, updates);
                            }}
                            title="체크 시 이 항목이 칸반 보드에 카드로 생성됩니다."
                        />
                    </div>

                    {/* Responsible */}
                    <div className="w-[100px] px-2">
                        <Select 
                            value={row.responsibleId} 
                            onValueChange={(val) => updateRow(row.id, { responsibleId: val })}
                        >
                            <SelectTrigger className="h-7 text-xs border-transparent focus:ring-0 bg-transparent p-0 hover:bg-gray-100/50 rounded px-1">
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
                    <div className="w-[50px] text-center text-xs text-gray-500 font-mono">
                        {row.duration > 0 ? row.duration : '-'}
                    </div>

                    {/* Actions */}
                    <div className="w-[80px] flex justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => addRow(row.id, 'sibling')}
                            title="형제 항목 추가"
                        >
                            <Folder className="w-3.5 h-3.5" />
                        </Button>
                        {/* 4뎁스(Level 3)에서는 하위 항목 추가 불가능 */}
                        {row.level < 3 && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => addRow(row.id, 'child')}
                                title="하위 항목 추가"
                            >
                                <CornerDownRight className="w-3.5 h-3.5" />
                            </Button>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeRow(row.id)}
                            title="삭제"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
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
            {/* Grid Header (3단 구조: 월 > 주차 > 날짜) */}
            <div className="bg-slate-800 text-white flex flex-col border-b border-slate-700 overflow-hidden select-none sticky top-0 z-10">
                {/* 1단: 월 표시 */}
                <div className="flex h-6 border-b border-slate-700">
                    {monthGroups.map((group, idx) => (
                        <div 
                            key={`month-${idx}`} 
                            className="flex items-center justify-center text-xs font-bold bg-slate-900 border-r border-slate-700 text-slate-200"
                            style={{ flex: group.days.length, minWidth: `${group.days.length * 24}px` }}
                        >
                            {group.month}월
                        </div>
                    ))}
                </div>

                {/* 2단: 주차 표시 */}
                <div className="flex h-5 border-b border-slate-700">
                    {weeks.map((week, idx) => (
                        <div 
                            key={`week-${idx}`} 
                            className="flex items-center justify-center text-[10px] font-medium bg-slate-800/80 border-r border-slate-700 text-slate-400"
                            style={{ flex: week.days.length, minWidth: `${week.days.length * 24}px` }}
                        >
                            {week.id}주
                        </div>
                    ))}
                </div>
                {/* 3단: 날짜/요일 표시 */}
                <div className="flex h-8">
                    {days.map(d => (
                        <div 
                            key={d.dateStr} 
                            className={cn(
                                "flex-1 min-w-[24px] border-r border-slate-700 flex flex-col items-center justify-center text-[10px] sm:text-xs",
                                d.dayOfWeek === 0 && "text-red-300 bg-red-900/10", // 일요일
                                d.dayOfWeek === 6 && "text-blue-300 bg-blue-900/10", // 토요일
                            )}
                        >
                            <span className="leading-none mb-0.5">{d.day}</span>
                            <span className="text-[9px] opacity-60 leading-none">{d.dayName}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-y-auto scrollbar-hide bg-[url('/grid-pattern.png')]">
                {rows.map((row, idx) => {
                    // 범위 내에 있는지 확인하는 헬퍼
                    const isInRange = (dateStr: string) => {
                        if (row.startDate === null || row.endDate === null) return false;
                        return dateStr >= row.startDate && dateStr <= row.endDate;
                    };
                    
                    // 시작점/끝점 스타일링을 위해
                    const isStart = row.startDate === null ? false : (dateStr: string) => dateStr === row.startDate;
                    const isEnd = row.endDate === null ? false : (dateStr: string) => dateStr === row.endDate;

                    // 비활성화 상태 로직 (카드 생성 안함 or 상위 그룹)
                    const isDisabled = !row.createCard;
                    const isGroup = idx < rows.length - 1 && rows[idx + 1].level > row.level;
                    const isInteractable = !isDisabled && !isGroup;

                    return (
                        <div key={row.id} className={cn("h-[56px] flex border-b border-gray-100 hover:bg-gray-50", isDisabled && "bg-slate-50/50 opacity-60")}>
                            {days.map(d => (
                                <div 
                                    key={d.dateStr} 
                                    className={cn(
                                        "flex-1 min-w-[24px] border-r border-dashed border-gray-200 transition-colors relative group",
                                        // 주말 배경색
                                        d.dayOfWeek === 0 && "bg-red-50/30",
                                        d.dayOfWeek === 6 && "bg-blue-50/30",
                                        // 상호작용 가능한 경우에만 커서 및 호버 효과
                                        isInteractable ? "cursor-pointer hover:bg-blue-50" : "cursor-default"
                                    )}
                                    onClick={() => handleCellClick(row.id, d.dateStr)}
                                    title={isInteractable ? `${d.month}월 ${d.day}일 (${d.dayName})` : (isGroup ? "하위 항목에 의해 자동 계산됩니다" : "카드 생성을 체크해야 설정 가능합니다")}
                                >
                                    {/* Bar Rendering */}
                                    {isInRange(d.dateStr) && (
                                        <div className={cn(
                                            "absolute top-[12px] bottom-[12px] left-0 right-0 bg-blue-500/80 shadow-sm", // 상하 여백 조정
                                            isStart(d.dateStr) && "left-[2px] rounded-l-md bg-blue-600",
                                            isEnd(d.dateStr) && "right-[2px] rounded-r-md bg-blue-600",
                                            // 상위 레벨(Phase 등)은 다른 색상 & 모양
                                            isGroup && "bg-slate-500/90 top-[18px] bottom-[18px] rounded-sm h-[20px]",
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