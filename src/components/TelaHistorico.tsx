import { useState, useMemo } from 'react';
import { HistoricoItem } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, Calendar, User, Briefcase, CheckSquare } from 'lucide-react';

interface TelaHistoricoProps {
  historico: HistoricoItem[];
  onVoltar: () => void;
}

export function TelaHistorico({ historico, onVoltar }: TelaHistoricoProps) {
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [anoSelecionado, setAnoSelecionado] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<HistoricoItem | null>(null);

  // Extrair anos únicos do histórico
  const anosDisponiveis = useMemo(() => {
    const anos = new Set(historico.map(h => h.MesAno.split('/')[1]));
    return Array.from(anos).sort((a, b) => b.localeCompare(a));
  }, [historico]);

  // Filtrar histórico
  const historicoFiltrado = useMemo(() => {
    if (!mesSelecionado || !anoSelecionado) return historico;
    
    const mesAnoFiltro = `${mesSelecionado}/${anoSelecionado}`;
    return historico.filter(h => h.MesAno === mesAnoFiltro);
  }, [historico, mesSelecionado, anoSelecionado]);

  const meses = [
    { valor: '01', nome: '1월' },
    { valor: '02', nome: '2월' },
    { valor: '03', nome: '3월' },
    { valor: '04', nome: '4월' },
    { valor: '05', nome: '5월' },
    { valor: '06', nome: '6월' },
    { valor: '07', nome: '7월' },
    { valor: '08', nome: '8월' },
    { valor: '09', nome: '9월' },
    { valor: '10', nome: '10월' },
    { valor: '11', nome: '11월' },
    { valor: '12', nome: '12월' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#007e7a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onVoltar}
              className="bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로
            </Button>
            <h1 className="text-gray-900 text-xl font-bold">요청 기록</h1>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {historicoFiltrado.length}개 요청
          </Badge>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">월</label>
                <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="월 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map(mes => (
                      <SelectItem key={mes.valor} value={mes.valor}>
                        {mes.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-600">년</label>
                <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map(ano => (
                      <SelectItem key={ano} value={ano}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setMesSelecionado('');
                  setAnoSelecionado('');
                }}
              >
                필터 초기화
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de histórico */}
        {historicoFiltrado.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              보관된 요청이 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {historicoFiltrado.map((item, index) => (
              <Card 
                key={index} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setItemSelecionado(item)}
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="flex-1">{item.Titulo}</span>
                    <Badge variant="outline" className="ml-2">
                      {item.MesAno}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Briefcase className="w-4 h-4" />
                      <span>{item.Projeto}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{item.ResponsavelNome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        완료일: {new Date(item.DataConclusao).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <CheckSquare className="w-4 h-4" />
                    <span>{item.ChecklistSnapshot.length}개 체크리스트 항목</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog para visualizar checklist */}
        <Dialog open={!!itemSelecionado} onOpenChange={() => setItemSelecionado(null)}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{itemSelecionado?.Titulo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">프로젝트:</span>
                  <p className="text-gray-900">{itemSelecionado?.Projeto}</p>
                </div>
                <div>
                  <span className="text-gray-600">담당자:</span>
                  <p className="text-gray-900">{itemSelecionado?.ResponsavelNome}</p>
                </div>
                <div>
                  <span className="text-gray-600">완료일:</span>
                  <p className="text-gray-900">
                    {itemSelecionado && new Date(itemSelecionado.DataConclusao).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">보관일:</span>
                  <p className="text-gray-900">
                    {itemSelecionado && new Date(itemSelecionado.DataArquivo).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {itemSelecionado && itemSelecionado.ChecklistSnapshot.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-gray-900">체크리스트:</h4>
                  <div className="border rounded-md p-3 space-y-2">
                    {itemSelecionado.ChecklistSnapshot.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Checkbox checked={item.Concluido} disabled />
                        <span className={item.Concluido ? 'line-through text-gray-500' : ''}>
                          {item.Item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
