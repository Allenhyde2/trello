import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase'; // firebase.ts 경로 확인 필요!
import { Demanda, Pessoa, HistoricoItem, StatusDemanda, Bug, BugComment } from '../types';

// Helper: Firestore 데이터를 앱에서 쓰는 타입으로 변환 (날짜 처리 등)
const convertDocToData = (doc: any) => {
  const data = doc.data();
  // Timestamp를 JS Date로 변환
  const convertDate = (val: any) => (val instanceof Timestamp ? val.toDate() : val);

  return {
    ...data,
    Id: doc.id,
    DataTarefa: convertDate(data.DataTarefa),
    PrazoEntrega: convertDate(data.PrazoEntrega),
    DataConclusao: data.DataConclusao ? convertDate(data.DataConclusao) : undefined,
    // Bugs 내부의 날짜들도 변환 필요
    Bugs: data.Bugs?.map((b: any) => ({
        ...b,
        CreatedAt: convertDate(b.CreatedAt),
        ResolvedAt: b.ResolvedAt ? convertDate(b.ResolvedAt) : undefined,
        Comments: b.Comments?.map((c: any) => ({
            ...c,
            CreatedAt: convertDate(c.CreatedAt)
        })) || []
    })) || []
  };
};

export function useDemandas() {
  const [colDemandas, setColDemandas] = useState<Demanda[]>([]);
  const [colEquipe, setColEquipe] = useState<Pessoa[]>([]);
  const [colHistorico, setColHistorico] = useState<HistoricoItem[]>([]);

  // 1. Firebase 데이터 구독 (실시간 동기화)
  useEffect(() => {
    // Demandas 불러오기
    const qDemandas = query(collection(db, "demandas")); // 필요시 orderBy 추가
    const unsubDemandas = onSnapshot(qDemandas, (snapshot) => {
      const demandasData = snapshot.docs.map(doc => convertDocToData(doc)) as Demanda[];
      setColDemandas(demandasData);
    });

    // Equipe 불러오기
    const qEquipe = query(collection(db, "equipe"));
    const unsubEquipe = onSnapshot(qEquipe, (snapshot) => {
      const equipeData = snapshot.docs.map(doc => ({ ...doc.data(), PessoaId: doc.id })) as Pessoa[];
      setColEquipe(equipeData);
    });

    // Historico 불러오기
    const qHistorico = query(collection(db, "historico"), orderBy("DataArquivo", "desc"));
    const unsubHistorico = onSnapshot(qHistorico, (snapshot) => {
      const historicoData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          Id: doc.id,
          DataConclusao: data.DataConclusao instanceof Timestamp ? data.DataConclusao.toDate() : data.DataConclusao,
          DataArquivo: data.DataArquivo instanceof Timestamp ? data.DataArquivo.toDate() : data.DataArquivo
        };
      }) as HistoricoItem[];
      setColHistorico(historicoData);
    });

    return () => {
      unsubDemandas();
      unsubEquipe();
      unsubHistorico();
    };
  }, []);

  // Avaliar status baseado no prazo (Helper 로직 유지)
  const avaliarStatusPorPrazo = (demanda: Demanda | Omit<Demanda, 'Id'>): StatusDemanda => {
    if (!demanda.PrazoEntrega) return 'Demandas Pendentes';
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prazo = new Date(demanda.PrazoEntrega);
    prazo.setHours(0, 0, 0, 0);
    
    const diffTime = prazo.getTime() - hoje.getTime();
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (demanda.Status === 'Demandas Resolvidas') return demanda.Status;

    if (dias <= 2) return 'Demandas Pendentes';
    else if (dias >= 5) return 'Demandas em Fila';
    else return demanda.Status;
  };

  const checklistCompleto = (checklist: any[]): boolean => {
    return checklist.length > 0 && checklist.every(item => item.Concluido);
  };

  // ---------------- CRUD Operations ----------------

  // Adicionar nova demanda
  const adicionarDemanda = async (demanda: Omit<Demanda, 'Id'>) => {
    try {
      const novaDemanda = { ...demanda };
      novaDemanda.Status = avaliarStatusPorPrazo(novaDemanda);
      
      await addDoc(collection(db, "demandas"), novaDemanda);
    } catch (error) {
      console.error("Erro ao adicionar demanda:", error);
    }
  };

  // Atualizar demanda
  const atualizarDemanda = async (id: string, updates: Partial<Demanda>) => {
    try {
      const demandaRef = doc(db, "demandas", id);
      const demandaAtual = colDemandas.find(d => d.Id === id);
      
      let finalUpdates = { ...updates };

      // Checklist 완료 시 자동 완료 처리 로직
      if (updates.Checklist && demandaAtual) {
         const mergedChecklist = updates.Checklist;
         if (checklistCompleto(mergedChecklist)) {
            finalUpdates.Status = 'Demandas Resolvidas';
            finalUpdates.DataConclusao = new Date();
         }
      }

      await updateDoc(demandaRef, finalUpdates);
    } catch (error) {
      console.error("Erro ao atualizar demanda:", error);
    }
  };

  // Mover demanda (Drag & Drop)
  const moverDemandaComIndex = useCallback(async (id: string, novoStatus: StatusDemanda, targetId?: string) => {
    // Firestore에서는 순서(Index)를 바꾸려면 별도의 order 필드가 필요하지만,
    // 일단 여기서는 Status 변경만 처리합니다. (순서는 날짜순 등으로 정렬됨)
    try {
      const demandaRef = doc(db, "demandas", id);
      const updates: any = { Status: novoStatus };
      
      if (novoStatus === 'Demandas Resolvidas') {
        updates.DataConclusao = new Date();
      }

      await updateDoc(demandaRef, updates);
    } catch (error) {
      console.error("Erro ao mover demanda:", error);
    }
  }, []);

  // Remover demanda
  const removerDemanda = async (id: string) => {
    try {
      await deleteDoc(doc(db, "demandas", id));
    } catch (error) {
      console.error("Erro ao remover demanda:", error);
    }
  };

  // Importar em massa
  const importarDemandasEmMassa = async (novasDemandas: Omit<Demanda, 'Id'>[]) => {
    const batch = writeBatch(db);
    novasDemandas.forEach(d => {
      const docRef = doc(collection(db, "demandas"));
      batch.set(docRef, d);
    });
    await batch.commit();
  };

  // ---------------- Bug Logic (Nested Updates) ----------------
  // Firestore는 배열 내부의 특정 객체 수정이 어렵기 때문에, 
  // 로컬에서 배열을 완성한 뒤 전체 배열을 덮어쓰는 방식을 사용합니다.

  const adicionarBug = async (demandaId: string, bug: Omit<Bug, 'Id' | 'Status' | 'Comments' | 'CreatedAt'>) => {
    const demanda = colDemandas.find(d => d.Id === demandaId);
    if (!demanda) return;

    const novoBug: Bug = {
      ...bug,
      Id: 'bug-' + Date.now(),
      Status: 'Reported',
      Comments: [],
      CreatedAt: new Date(),
    };

    const novosBugs = [...(demanda.Bugs || []), novoBug];
    await updateDoc(doc(db, "demandas", demandaId), { Bugs: novosBugs });
  };

  const atualizarStatusBug = async (demandaId: string, bugId: string, status: Bug['Status']) => {
    const demanda = colDemandas.find(d => d.Id === demandaId);
    if (!demanda) return;

    const novosBugs = (demanda.Bugs || []).map(b => {
      if (b.Id === bugId) {
        return { 
          ...b, 
          Status: status,
          ResolvedAt: status === 'Resolved' ? new Date() : undefined
        };
      }
      return b;
    });
    await updateDoc(doc(db, "demandas", demandaId), { Bugs: novosBugs });
  };

  const adicionarComentarioBug = async (demandaId: string, bugId: string, comment: string, author: string) => {
    const demanda = colDemandas.find(d => d.Id === demandaId);
    if (!demanda) return;

    const novosBugs = (demanda.Bugs || []).map(b => {
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
    });
    await updateDoc(doc(db, "demandas", demandaId), { Bugs: novosBugs });
  };

  // ---------------- Other Features ----------------

  // Zerar mês atual (Transaction/Batch 사용 권장)
  const zerarMesAtual = async () => { // async 변경
    const resolvidas = colDemandas.filter(d => d.Status === 'Demandas Resolvidas');
    
    if (resolvidas.length === 0) {
      return { success: false, message: '보관할 완료된 요청이 없습니다.' };
    }

    try {
      const batch = writeBatch(db);
      const hoje = new Date();
      const mesAno = hoje.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });

      resolvidas.forEach(d => {
        // 1. 히스토리에 추가
        const histRef = doc(collection(db, "historico"));
        const itemHistorico: any = {
          IdOriginal: d.Id,
          Titulo: d.Titulo,
          ResponsavelNome: d.ResponsavelNome,
          Projeto: d.Projeto,
          Categoria: d.Categoria,
          DataConclusao: d.DataConclusao || new Date(),
          ChecklistSnapshot: d.Checklist,
          MesAno: mesAno,
          DataArquivo: new Date(),
        };
        batch.set(histRef, itemHistorico);

        // 2. 기존 목록에서 삭제
        const demRef = doc(db, "demandas", d.Id);
        batch.delete(demRef);
      });

      await batch.commit();
      return { success: true, message: `${resolvidas.length}개의 요청이 성공적으로 보관되었습니다!` };
    } catch (e) {
      console.error(e);
      return { success: false, message: '오류가 발생했습니다.' };
    }
  };

  const reavaliarStatusDemandas = () => {
    // Firestore에서는 매번 전체 쓰기를 하면 비용이 발생하므로,
    // 변경이 필요한 항목만 찾아서 업데이트하는 것이 좋습니다.
    colDemandas.forEach(d => {
      if (d.Status !== 'Demandas Resolvidas') {
        const novoStatus = avaliarStatusPorPrazo(d);
        if (novoStatus !== d.Status) {
           updateDoc(doc(db, "demandas", d.Id), { Status: novoStatus });
        }
      }
    });
  };

  const limparTudo = async () => {
    const batch = writeBatch(db);
    colDemandas.forEach(d => {
      batch.delete(doc(db, "demandas", d.Id));
    });
    await batch.commit();
    return { success: true, message: '모든 요청이 삭제되었습니다.' };
  };

  // ---------------- Equipe Management ----------------

  const adicionarPessoa = async (pessoa: Omit<Pessoa, 'PessoaId'>) => {
    try {
      await addDoc(collection(db, "equipe"), pessoa);
    } catch (e) { console.error(e); }
  };

  const atualizarPessoa = async (id: string, updates: Partial<Pessoa>) => {
    try {
      await updateDoc(doc(db, "equipe", id), updates);
    } catch (e) { console.error(e); }
  };

  const removerPessoa = async (id: string) => {
    try {
      await deleteDoc(doc(db, "equipe", id));
    } catch (e) { console.error(e); }
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
    zerarMesAtual: () => zerarMesAtual().then(res => res), // Async 래핑 처리 필요 시
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
