import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from './ui/button';
import { Upload, FileSpreadsheet, AlertCircle, HelpCircle } from 'lucide-react';
import { Demanda, StatusDemanda } from '../types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface ExcelImporterProps {
  onImport: (demandas: Omit<Demanda, 'Id'>[]) => void;
}

export function ExcelImporter({ onImport }: ExcelImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  // 헤더 정규화 (소문자, 공백 제거)
  const normalize = (str: any) => String(str || '').toLowerCase().replace(/[\s_]/g, '');

  // 스마트 헤더 감지 및 데이터 파싱
  const parseExcelData = (ws: XLSX.WorkSheet) => {
    // 1. 2차원 배열로 변환 (헤더 없이 날것으로 가져옴)
    // defval: '' 옵션으로 빈 셀도 빈 문자열로 가져오게 함
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    if (!rawData || rawData.length === 0) return [];

    // 2. 헤더 행 찾기
    // 키워드 대폭 확장
    const keyKeywords = [
        '제목', 'title', 'task', '작업', 'name', '기능', '업무', '항목', '내용', 'subject', 'item', 'summary',
        '프로젝트', 'project', 'prj', '분류',
        '담당', 'assignee', 'owner', 'user', '개발', '작업자',
        '상태', 'status', 'state', '진행', '결과',
        '날짜', 'date', '기간', '시작', '종료', '마감', 'due', 'start', 'end',
        'wbs', 'id', '번호', 'no', '순번',
        '우선', '중요', 'prio', 'level', 'lv', 'depth', '단계'
    ];
    
    let headerRowIndex = -1;
    let maxMatchCount = -1;
    let maxFilledCols = -1; // 데이터가 가장 많이 채워진 행을 찾기 위함

    // 상위 30행까지만 스캔 (보통 헤더는 상단에 위치)
    for (let i = 0; i < Math.min(rawData.length, 30); i++) {
        const row = rawData[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        let matchCount = 0;
        let filledCols = 0;

        row.forEach((cell: any) => {
            if (!cell) return;
            filledCols++; // 데이터가 있는 컬럼 수 카운트
            const cellStr = normalize(cell);
            if (keyKeywords.some(k => cellStr.includes(k))) matchCount++;
        });

        // 키워드가 더 많이 매칭된 행을 우선
        if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            headerRowIndex = i;
        } 
        // 키워드 매칭이 아예 없다면, 컬럼이 가장 많이 채워진 행을 후보로 (헤더일 가능성 높음)
        else if (maxMatchCount === 0 && filledCols > maxFilledCols) {
            maxFilledCols = filledCols;
            headerRowIndex = i; // 임시 후보
        }
    }

    // 헤더 행을 못 찾았거나 매칭 점수가 0점인데 데이터도 별로 없으면 -> 그냥 0번째 행 사용
    if (headerRowIndex === -1) headerRowIndex = 0;

    console.log(`Header detected at row ${headerRowIndex}:`, rawData[headerRowIndex]);

    const headers = rawData[headerRowIndex].map((h: any) => normalize(h));
    const bodyRows = rawData.slice(headerRowIndex + 1);

    // 3. 컬럼 인덱스 매핑 (더 유연하게)
    const colMap: Record<string, number> = {};
    
    headers.forEach((h, idx) => {
        if (!h) return;
        if (['제목', 'title', 'task', '작업', 'name', '기능', '업무', '항목', '내용', 'subject'].some(k => h.includes(k))) colMap['title'] = idx;
        else if (['프로젝트', 'project', 'prj'].some(k => h.includes(k))) colMap['project'] = idx;
        else if (['카테고리', 'category', 'cat', '단계', 'phase', '구분', 'group'].some(k => h.includes(k))) colMap['category'] = idx;
        else if (['설명', 'desc', '비고', '상세', '메모', 'memo'].some(k => h.includes(k))) colMap['description'] = idx;
        else if (['담당', 'assignee', 'owner', 'user', '개발', '작업자', 'who'].some(k => h.includes(k))) colMap['responsible'] = idx;
        else if (['상태', 'status', 'state', '진행', '결과', '여부'].some(k => h.includes(k))) colMap['status'] = idx;
        else if (['우선', 'priority', 'prio', '중요', '급', 'grade'].some(k => h.includes(k))) colMap['priority'] = idx;
        else if (['시작', 'start', 'begin', 'from'].some(k => h.includes(k))) colMap['startDate'] = idx;
        else if (['종료', 'end', 'due', 'finish', '마감', '완료', 'to', 'target'].some(k => h.includes(k))) colMap['endDate'] = idx;
        else if (['id', 'wbs', '번호', 'code', 'no'].some(k => h.includes(k))) colMap['wbsId'] = idx;
        else if (['level', 'depth', 'lv', '레벨', '깊이', '들여쓰기'].some(k => h.includes(k))) colMap['level'] = idx;
    });

    // Fallback: 제목 컬럼을 못 찾았으면, 가장 첫 번째 텍스트 컬럼을 제목으로 사용
    if (colMap['title'] === undefined) {
        // 0번, 1번, 2번 컬럼 중 하나를 제목으로 추정
        for (let i = 0; i < headers.length; i++) {
            // wbsId나 level, date 등이 아닌 첫 번째 컬럼
            const isReserved = Object.values(colMap).includes(i);
            if (!isReserved) {
                colMap['title'] = i;
                break;
            }
        }
        // 그래도 없으면 0번 강제 할당
        if (colMap['title'] === undefined) colMap['title'] = 0;
    }

    // 4. 데이터 매핑
    const parsedDemandas: Omit<Demanda, 'Id'>[] = [];

    bodyRows.forEach((row) => {
        // 빈 행 체크
        if (!row || row.length === 0 || row.every((c: any) => !c)) return;

        // 제목 가져오기
        const rawTitle = row[colMap['title']];
        if (!rawTitle) return; // 제목 없으면 스킵

        let title = String(rawTitle).trim();
        let depth = 0;

        // 뎁스 추론 로직 (기존 유지 + 보완)
        if (colMap['level'] !== undefined && row[colMap['level']]) {
             const lvVal = row[colMap['level']];
             if (typeof lvVal === 'number') depth = Math.max(0, lvVal - 1);
             else if (typeof lvVal === 'string') depth = (parseInt(lvVal.replace(/\D/g, '')) || 1) - 1;
        } 
        else if (colMap['wbsId'] !== undefined && row[colMap['wbsId']]) {
             const wbsId = String(row[colMap['wbsId']]);
             depth = (wbsId.match(/\./g) || []).length;
        }
        else {
             // 공백 기반 추론
             const leadingSpaces = String(rawTitle).match(/^\s*/)?.[0].length || 0;
             if (leadingSpaces > 0) depth = Math.floor(leadingSpaces / 2); // 2칸당 1뎁스
        }

        // 카테고리
        let categoria = '일반';
        if (colMap['category'] !== undefined && row[colMap['category']]) {
            categoria = String(row[colMap['category']]);
        }

        // 설명
        let descricao = '';
        if (colMap['description'] !== undefined && row[colMap['description']]) {
            descricao = String(row[colMap['description']]);
        }

        // 날짜 파싱
        const parseDate = (val: any) => {
            if (!val) return null;
            if (typeof val === 'number') {
                // 엑셀 날짜 시리얼
                return new Date(Math.round((val - 25569) * 86400 * 1000));
            }
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        const startDate = colMap['startDate'] !== undefined ? parseDate(row[colMap['startDate']]) : null;
        const endDate = colMap['endDate'] !== undefined ? parseDate(row[colMap['endDate']]) : null;
        
        let periodStr = '';
        if (startDate && endDate) {
            periodStr = ` [일정: ${startDate.getMonth()+1}/${startDate.getDate()} ~ ${endDate.getMonth()+1}/${endDate.getDate()}]`;
        } else if (endDate) {
            periodStr = ` [마감: ${endDate.getMonth()+1}/${endDate.getDate()}]`;
        }

        // 담당자
        const responsavel = colMap['responsible'] !== undefined ? String(row[colMap['responsible']] || '미지정') : '미지정';

        // 상태
        let status: StatusDemanda = 'Demandas em Fila';
        if (colMap['status'] !== undefined && row[colMap['status']]) {
            const s = String(row[colMap['status']]).toLowerCase();
            if (s.includes('진행') || s.includes('ing') || s.includes('progress') || s.includes('중')) status = 'Demandas Pendentes';
            if (s.includes('완료') || s.includes('done') || s.includes('end') || s.includes('끝')) status = 'Demandas Resolvidas';
        }

        // 우선순위
        let prioridade: 'High' | 'Medium' | 'Low' = 'Medium';
        if (colMap['priority'] !== undefined && row[colMap['priority']]) {
            const p = String(row[colMap['priority']]).toLowerCase();
            if (p.includes('높') || p.includes('high') || p.includes('상') || p.includes('1')) prioridade = 'High';
            if (p.includes('낮') || p.includes('low') || p.includes('하') || p.includes('3')) prioridade = 'Low';
        }

        // 설명에 뎁스 시각화
        let depthPrefix = '';
        if (depth > 0) depthPrefix = '└ '.repeat(depth) + ' ';

        parsedDemandas.push({
            Titulo: title,
            Descricao: `${depthPrefix}${descricao}${periodStr}`,
            Projeto: colMap['project'] !== undefined ? String(row[colMap['project']] || '기본 프로젝트') : '기본 프로젝트',
            Categoria: categoria,
            ResponsavelNome: responsavel,
            ResponsavelId: 'temp-' + Math.random().toString(36).substr(2, 5),
            Status: status,
            DataTarefa: new Date(),
            PrazoEntrega: endDate || new Date(),
            Checklist: [],
            Prioridade: prioridade,
            Bugs: []
        });
    });

    return parsedDemandas;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // 시트가 여러 개일 수 있으므로 첫 번째 시트 사용
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const demandas = parseExcelData(ws);

        if (demandas.length > 0) {
            onImport(demandas);
            toast.success(`${demandas.length}개의 항목을 성공적으로 불러왔습니다.`);
            setIsOpen(false);
        } else {
            // 더 구체적인 에러 메시지
            toast.error('엑셀 데이터를 인식하지 못했습니다. 첫 번째 열에 "제목"이나 "작업명"을 입력해보세요.');
        }

      } catch (error) {
        console.error('Excel parsing error:', error);
        toast.error('엑셀 파일을 읽는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '프로젝트': '쇼핑몰 구축',
        'WBS ID': '1.1',
        '카테고리': '기획',
        '작업명': '요구사항 정의',
        '상세설명': '고객 요구사항 인터뷰',
        '담당자': '김기획',
        '시작일': '2024-01-01',
        '종료일': '2024-01-05',
        '우선순위': 'High',
        '상태': '완료'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WBS Template");
    XLSX.writeFile(wb, "wbs_template.xlsx");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white gap-2">
          <FileSpreadsheet className="w-4 h-4 text-green-700" />
          Excel 업로드
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>스마트 Excel 업로드</DialogTitle>
          <DialogDescription>
            이제 대부분의 엑셀 형식을 자동으로 인식합니다.
            <br />
            "제목", "작업명", "Task" 등의 컬럼이 있으면 자동으로 매핑됩니다.
            <br />
            인식이 안 된다면, A열에 작업 제목을 넣어보세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">클릭하여 업로드</span>
                </p>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  모든 형식 지원<br/>(헤더 자동 감지 및 강제 매핑)
                </p>
              </div>
              <input 
                id="dropzone-file" 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={loading}
                ref={fileInputRef}
              />
            </label>
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-500">
             <div className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span>데이터가 없으면 A열을 제목으로 인식합니다.</span>
             </div>
             <Button variant="link" onClick={handleDownloadTemplate} className="text-[#007e7a]">
                기본 템플릿
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
