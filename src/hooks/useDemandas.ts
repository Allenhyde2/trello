import { useState, useEffect, useCallback } from 'react';
import { Demanda, Pessoa, HistoricoItem, StatusDemanda } from '../types';

// Hook centralizado para gerenciar o estado das demandas
export function useDemandas() {
  const [colDemandas, setColDemandas] = useState<Demanda[]>([]);
  const [colEquipe, setColEquipe] = useState<Pessoa[]>([]);
  const [colHistorico, setColHistorico] = useState<HistoricoItem[]>([]);

  // Inicializar dados de exemplo
  useEffect(() => {
    // Equipe de exemplo
    const equipeInicial: Pessoa[] = [
      { PessoaId: '1', Nome: '김민수', Email: 'minsu.kim@company.com' },
      { PessoaId: '2', Nome: '이영희', Email: 'younghee.lee@company.com' },
      { PessoaId: '3', Nome: '박준호', Email: 'junho.park@company.com' },
    ];

    // Demandas de exemplo
    const demandasIniciais: Demanda[] = [
      {
        Id: '1',
        Titulo: '프로젝트 문서 검토',
        DataTarefa: new Date(),
        PrazoEntrega: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Amanhã
        Checklist: [
          { Item: '섹션 1 검토', Concluido: true },
          { Item: '섹션 2 검토', Concluido: false },
          { Item: '목차 업데이트', Concluido: false },
        ],
        Status: 'Demandas Pendentes',
        Projeto: '프로젝트 알파',
        Categoria: '기획 > 문서화 > 최종검토',
        Descricao: '전체적인 프로젝트 문서 구조 및 내용을 검토합니다.',
        ResponsavelId: '1',
        ResponsavelNome: '김민수',
        Prioridade: 'High',
      },
      {
        Id: '2',
        Titulo: '경영진 발표 준비',
        DataTarefa: new Date(),
        PrazoEntrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        Checklist: [
          { Item: '슬라이드 제작', Concluido: false },
          { Item: '내용 검토', Concluido: false },
        ],
        Status: 'Demandas em Fila',
        Projeto: '프로젝트 베타',
        Categoria: '대외협력 > 경영지원 > 발표자료',
        Descricao: '다음 주 예정인 경영진 보고를 위한 자료 준비',
        ResponsavelId: '2',
        ResponsavelNome: '이영희',
        Prioridade: 'Medium',
      },
      {
        Id: '3',
        Titulo: '3분기 데이터 분석',
        DataTarefa: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        PrazoEntrega: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Atrasado
        Checklist: [
          { Item: '데이터 수집', Concluido: true },
          { Item: '결과 분석', Concluido: false },
          { Item: '보고서 생성', Concluido: false },
        ],
        Status: 'Demandas Pendentes',
        Projeto: '프로젝트 감마',
        Categoria: 'R&D > 데이터분석 > 3분기',
        Descricao: '3분기 매출 및 사용자 데이터 상세 분석',
        ResponsavelId: '3',
        ResponsavelNome: '박준호',
        Prioridade: 'High',
      },
    ];

    setColEquipe(equipeInicial);
    setColDemandas(demandasIniciais);
  }, []);

  // Avaliar status baseado no prazo (regra de negócio)
  const avaliarStatusPorPrazo = (demanda: Demanda): StatusDemanda => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prazo = new Date(demanda.PrazoEntrega);
    prazo.setHours(0, 0, 0, 0);
    
    const diffTime = prazo.getTime() - hoje.getTime();
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Se já está resolvida, manter
    if (demanda.Status === 'Demandas Resolvidas') {
      return demanda.Status;
    }

    // Regras de negócio
    if (dias <= 2) {
      return 'Demandas Pendentes';
    } else if (dias >= 5) {
      return 'Demandas em Fila';
    } else {
      // dias 3-4: usuário decide, manter status atual
      return demanda.Status;
    }
  };

  // Verificar se checklist está completo
  const checklistCompleto = (checklist: ChecklistItem[]): boolean => {
    return checklist.length > 0 && checklist.every(item => item.Concluido);
  };

  // Atualizar uma demanda específica
  const atualizarDemanda = (id: string, updates: Partial<Demanda>) => {
    setColDemandas(prev => {
      const updated = prev.map(d => {
        if (d.Id === id) {
          const demandaAtualizada = { ...d, ...updates };
          
          // Se checklist foi completado, mover para Resolvidas
          if (updates.Checklist && checklistCompleto(demandaAtualizada.Checklist)) {
            demandaAtualizada.Status = 'Demandas Resolvidas';
            demandaAtualizada.DataConclusao = new Date();
          }
          
          return demandaAtualizada;
        }
        return d;
      });
      return updated;
    });
  };

  // 버그 관련 기능
  const adicionarBug = (demandaId: string, bug: Omit<Bug, 'Id' | 'Status' | 'Comments' | 'CreatedAt'>) => {
    setColDemandas(prev => prev.map(d => {
      if (d.Id === demandaId) {
        const novoBug: Bug = {
          ...bug,
          Id: 'bug-' + Date.now(),
          Status: 'Reported',
          Comments: [],
          CreatedAt: new Date(),
        };
        return { ...d, Bugs: [...(d.Bugs || []), novoBug] };
      }
      return d;
    }));
  };

  const atualizarStatusBug = (demandaId: string, bugId: string, status: Bug['Status']) => {
    setColDemandas(prev => prev.map(d => {
      if (d.Id === demandaId) {
        return {
          ...d,
          Bugs: (d.Bugs || []).map(b => {
            if (b.Id === bugId) {
              return { 
                  ...b, 
                  Status: status,
                  ResolvedAt: status === 'Resolved' ? new Date() : undefined
              };
            }
            return b;
          })
        };
      }
      return d;
    }));
  };

  const adicionarComentarioBug = (demandaId: string, bugId: string, comment: string, author: string) => {
     setColDemandas(prev => prev.map(d => {
      if (d.Id === demandaId) {
        return {
          ...d,
          Bugs: (d.Bugs || []).map(b => {
            if (b.Id === bugId) {
              const novoComentario: BugComment = {
                  Id: 'cmt-' + Date.now(),
                  AuthorName: author,
                  Content: comment,
                  CreatedAt: new Date()
              };
              return { ...b, Comments: [...b.Comments, novoComentario] };
            }
            return b;
          })
        };
      }
      return d;
    }));
  };

  // Mover demanda e reordenar
  const moverDemandaComIndex = useCallback((id: string, novoStatus: StatusDemanda, targetId?: string) => {
    setColDemandas(prev => {
      const draggedItem = prev.find(d => d.Id === id);
      if (!draggedItem) return prev;

      // Status 변경이 있는 경우 업데이트
      let updatedItem = { ...draggedItem };
      if (draggedItem.Status !== novoStatus) {
        updatedItem.Status = novoStatus;
        if (novoStatus === 'Demandas Resolvidas') {
          updatedItem.DataConclusao = new Date();
        }
      }

      // 기존 리스트에서 제거
      const filtered = prev.filter(d => d.Id !== id);

      // 같은 Status 그룹 내에서의 위치 찾기
      const targetIndex = targetId 
        ? filtered.findIndex(d => d.Id === targetId) 
        : -1;

      // 새 위치에 삽입
      if (targetIndex !== -1) {
        // targetId 뒤에 삽입 (혹은 앞에? 로직에 따라 다름, 여기서는 splice로 해당 인덱스에 삽입)
        // 같은 status인 항목들 중에서 target의 인덱스를 찾아야 정확함.
        // 하지만 전체 배열에서 관리하므로, 전체 배열 상의 target 위치를 기준으로 함.
        const newArray = [...filtered];
        newArray.splice(targetIndex, 0, updatedItem);
        return newArray;
      } else {
        // targetId가 없으면 (맨 끝으로 이동하거나 빈 컬럼으로 이동)
        // 해당 status 그룹의 맨 뒤로 보내거나 그냥 배열 맨 뒤로
        return [...filtered, updatedItem];
      }
    });
  }, []);

  // Adicionar nova demanda
  const adicionarDemanda = (demanda: Omit<Demanda, 'Id'>) => {
    const novaDemanda: Demanda = {
      ...demanda,
      Id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    
    // Avaliar status inicial baseado no prazo
    novaDemanda.Status = avaliarStatusPorPrazo(novaDemanda);
    
    setColDemandas(prev => [...prev, novaDemanda]);
    return novaDemanda;
  };

  // Importar múltiplas demandas (Excel)
  const importarDemandasEmMassa = (novasDemandas: Omit<Demanda, 'Id'>[]) => {
      const demandasComId = novasDemandas.map(d => ({
          ...d,
          Id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }));
      setColDemandas(prev => [...prev, ...demandasComId]);
  };

  // Remover demanda
  const removerDemanda = (id: string) => {
    setColDemandas(prev => prev.filter(d => d.Id !== id));
  };

  // Zerar mês atual (arquivar resolvidas)
  const zerarMesAtual = () => {
    const resolvidas = colDemandas.filter(d => d.Status === 'Demandas Resolvidas');
    
    if (resolvidas.length === 0) {
      return { success: false, message: '보관할 완료된 요청이 없습니다.' };
    }

    const hoje = new Date();
    const mesAno = hoje.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });

    // Adicionar ao histórico
    const itensHistorico: HistoricoItem[] = resolvidas.map(d => ({
      IdOriginal: d.Id,
      Titulo: d.Titulo,
      ResponsavelNome: d.ResponsavelNome,
      Projeto: d.Projeto,
      Categoria: d.Categoria,
      DataConclusao: d.DataConclusao || new Date(),
      ChecklistSnapshot: d.Checklist,
      MesAno: mesAno,
      DataArquivo: new Date(),
    }));

    setColHistorico(prev => [...prev, ...itensHistorico]);
    
    // Remover resolvidas
    setColDemandas(prev => prev.filter(d => d.Status !== 'Demandas Resolvidas'));

    return { success: true, message: `${resolvidas.length}개의 요청이 성공적으로 보관되었습니다!` };
  };

  // Reavaliar status de todas as demandas (executar periodicamente)
  const reavaliarStatusDemandas = () => {
    setColDemandas(prev => 
      prev.map(d => {
        if (d.Status !== 'Demandas Resolvidas') {
          return { ...d, Status: avaliarStatusPorPrazo(d) };
        }
        return d;
      })
    );
  };

  // Gerenciar equipe
  const adicionarPessoa = (pessoa: Omit<Pessoa, 'PessoaId'>) => {
    const novaPessoa: Pessoa = {
      ...pessoa,
      PessoaId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setColEquipe(prev => [...prev, novaPessoa]);
    return novaPessoa;
  };

  const atualizarPessoa = (id: string, updates: Partial<Pessoa>) => {
    setColEquipe(prev => prev.map(p => p.PessoaId === id ? { ...p, ...updates } : p));
  };

  const removerPessoa = (id: string) => {
    setColEquipe(prev => prev.filter(p => p.PessoaId !== id));
  };

  // 모든 데이터 초기화 (Reset All)
  const limparTudo = () => {
    setColDemandas([]);
    return { success: true, message: '모든 요청이 삭제되었습니다.' };
  };

  return {
    colDemandas,
    colEquipe,
    colHistorico,
    atualizarDemanda,
    moverDemandaComIndex,
    adicionarDemanda,
    importarDemandasEmMassa,
    removerDemanda,
    zerarMesAtual,
    limparTudo,
    reavaliarStatusDemandas,
    adicionarPessoa,
    atualizarPessoa,
    removerPessoa,
    adicionarBug,
    atualizarStatusBug,
    adicionarComentarioBug
  };
}
