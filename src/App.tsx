import { useState, useEffect } from 'react';
import { useDemandas } from './hooks/useDemandas';
import { TelaPrincipal } from './components/TelaPrincipal';
import { TelaNovaDemanda } from './components/TelaNovaDemanda';
import { TelaHistorico } from './components/TelaHistorico';
import { TelaEquipe } from './components/TelaEquipe';
import { TelaWBS } from './components/TelaWBS';
import { Demanda, StatusDemanda } from './types';
import { Toaster, toast } from 'sonner';

type TelaAtiva = 'principal' | 'historico' | 'wbs';

export default function App() {
  const {
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
    removerPessoa,
    adicionarBug,
    atualizarStatusBug,
    adicionarComentarioBug,
  } = useDemandas();

  const [telaAtiva, setTelaAtiva] = useState<TelaAtiva>('principal');
  const [modalNovaDemanda, setModalNovaDemanda] = useState(false);
  const [modalEquipe, setModalEquipe] = useState(false);
  const [demandaEditando, setDemandaEditando] = useState<Demanda | null>(null);

  // Reavaliar status das demandas ao iniciar e periodicamente
  useEffect(() => {
    reavaliarStatusDemandas();

    // Reavaliar a cada 1 hora (pode ajustar conforme necessário)
    const interval = setInterval(() => {
      reavaliarStatusDemandas();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Verificar se checklist foi completado após atualização
  useEffect(() => {
    colDemandas.forEach(demanda => {
      if (demanda.Status !== 'Demandas Resolvidas') {
        const checklistCompleto = 
          demanda.Checklist.length > 0 && 
          demanda.Checklist.every(item => item.Concluido);
        
        if (checklistCompleto) {
          // Mover automaticamente para resolvidas
          atualizarDemanda(demanda.Id, {
            Status: 'Demandas Resolvidas',
            DataConclusao: new Date(),
          });
          toast.success(`"${demanda.Titulo}" 요청이 자동으로 완료되었습니다!`);
        }
      }
    });
  }, [colDemandas]);

  // 동기화: colDemandas가 변경되면 현재 편집 중인 수요 객체도 최신 상태로 업데이트
  useEffect(() => {
    if (demandaEditando) {
      const updatedDemanda = colDemandas.find(d => d.Id === demandaEditando.Id);
      // 만약 해당 수요가 삭제되었다면 모달을 닫을 수도 있겠지만, 여기선 데이터 갱신만 처리
      if (updatedDemanda && updatedDemanda !== demandaEditando) {
        setDemandaEditando(updatedDemanda);
      }
    }
  }, [colDemandas]);

  const handleNovaDemanda = () => {
    setDemandaEditando(null);
    setModalNovaDemanda(true);
  };

  const handleEditarDemanda = (demanda: Demanda) => {
    setDemandaEditando(demanda);
    setModalNovaDemanda(true);
  };

  const handleSalvarDemanda = (demanda: Omit<Demanda, 'Id'>) => {
    adicionarDemanda(demanda);
    toast.success('요청이 성공적으로 생성되었습니다!');
  };

  const handleAtualizarDemanda = (id: string, updates: Partial<Demanda>) => {
    atualizarDemanda(id, updates);
    toast.success('요청이 성공적으로 업데이트되었습니다!');
  };

  const handleMoverDemanda = (id: string, novoStatus: StatusDemanda) => {
    const demanda = colDemandas.find(d => d.Id === id);
    if (!demanda) return;

    const updates: Partial<Demanda> = { Status: novoStatus };
    
    // Se mover para resolvidas, registrar data de conclusão
    if (novoStatus === 'Demandas Resolvidas') {
      updates.DataConclusao = new Date();
    }

    atualizarDemanda(id, updates);
  };

  const handleZerarMes = () => {
    const resultado = zerarMesAtual();
    if (resultado.success) {
      toast.success(resultado.message);
    } else {
      toast.info(resultado.message);
    }
  };

  const handleLimparTudo = () => {
      const resultado = limparTudo();
      if (resultado.success) {
          toast.success(resultado.message);
      }
  };

  const handleAbrirHistorico = () => {
    setTelaAtiva('historico');
  };

  const handleAbrirWBS = () => {
    setTelaAtiva('wbs');
  };

  const handleVoltarPrincipal = () => {
    setTelaAtiva('principal');
  };

  const handleAbrirEquipe = () => {
    setModalEquipe(true);
  };

  return (
    <>
      {telaAtiva === 'principal' ? (
        <TelaPrincipal
          demandas={colDemandas}
          equipe={colEquipe}
          onNovaDemanda={handleNovaDemanda}
          onEditarDemanda={handleEditarDemanda}
          onMoverDemanda={handleMoverDemanda}
          onZerarMes={handleZerarMes}
          onLimparTudo={handleLimparTudo}
          onAbrirHistorico={handleAbrirHistorico}
          onAbrirEquipe={handleAbrirEquipe}
          onAbrirWBS={handleAbrirWBS} // 추가: WBS 페이지 이동 핸들러 전달
          moverDemandaComIndex={moverDemandaComIndex}
          onImportarExcel={importarDemandasEmMassa}
        />
      ) : telaAtiva === 'historico' ? (
        <TelaHistorico
          historico={colHistorico}
          onVoltar={handleVoltarPrincipal}
        />
      ) : (
        <TelaWBS
          equipe={colEquipe}
          onExportarParaKanban={importarDemandasEmMassa}
          onVoltar={handleVoltarPrincipal}
        />
      )}

      <TelaNovaDemanda
        open={modalNovaDemanda}
        onClose={() => {
          setModalNovaDemanda(false);
          setDemandaEditando(null);
        }}
        onSalvar={handleSalvarDemanda}
        equipe={colEquipe}
        demandaEdit={demandaEditando}
        onAtualizar={handleAtualizarDemanda}
        onAddBug={adicionarBug}
        onUpdateBugStatus={atualizarStatusBug}
        onAddBugComment={adicionarComentarioBug}
      />

      <TelaEquipe
        open={modalEquipe}
        onClose={() => setModalEquipe(false)}
        equipe={colEquipe}
        onAdicionar={adicionarPessoa}
        onRemover={removerPessoa}
      />

      <Toaster position="top-right" richColors />
    </>
  );
}
