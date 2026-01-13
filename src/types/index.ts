// Tipos para o sistema Kanban
export type StatusDemanda = "Demandas em Fila" | "Demandas Pendentes" | "Demandas Resolvidas";

export interface ChecklistItem {
  Item: string;
  Concluido: boolean;
}

export interface BugComment {
  Id: string;
  AuthorName: string;
  Content: string;
  CreatedAt: Date;
}

export type BugStatus = 'Reported' | 'Confirmed' | 'Resolved';

export interface Bug {
  Id: string;
  Title: string;
  Description: string;
  ImageUrl?: string;
  Status: BugStatus;
  Comments: BugComment[];
  CreatedAt: Date;
  ResolvedAt?: Date;
}

export interface Demanda {
  Id: string;
  Titulo: string;
  DataTarefa: Date;
  PrazoEntrega: Date;
  Checklist: ChecklistItem[];
  Status: StatusDemanda;
  Projeto: string;
  ResponsavelId: string;
  ResponsavelNome: string;
  DataConclusao?: Date;
  
  // WBS 확장 필드
  Categoria?: string; // 기능 카테고리 (Depth)
  Descricao?: string; // 상세 설명
  Prioridade?: 'High' | 'Medium' | 'Low'; // 우선순위 (추가 제안)
  
  // 버그 리포트
  Bugs?: Bug[];
}

export interface Pessoa {
  PessoaId: string;
  Nome: string;
  Email: string;
}

export interface HistoricoItem {
  IdOriginal: string;
  Titulo: string;
  ResponsavelNome: string;
  Projeto: string;
  DataConclusao: Date;
  ChecklistSnapshot: ChecklistItem[];
  MesAno: string;
  DataArquivo: Date;
  
  // WBS 확장 필드 (History)
  Categoria?: string;
  // 버그 아카이브 (선택적)
  ArchivedBugs?: Bug[]; 
}

export type ColunaAtiva = "Todas" | "Fila" | "Pendentes" | "Resolvidas";
