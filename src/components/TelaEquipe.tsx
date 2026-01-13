import { useState } from 'react';
import { Pessoa } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Trash2, Mail, User } from 'lucide-react';
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

interface TelaEquipeProps {
  open: boolean;
  onClose: () => void;
  equipe: Pessoa[];
  onAdicionar: (pessoa: Omit<Pessoa, 'PessoaId'>) => void;
  onRemover: (id: string) => void;
}

export function TelaEquipe({ open, onClose, equipe, onAdicionar, onRemover }: TelaEquipeProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [pessoaParaRemover, setPessoaParaRemover] = useState<Pessoa | null>(null);

  const handleAdicionar = () => {
    if (!nome.trim() || !email.trim()) {
      alert('이름과 이메일을 입력해주세요.');
      return;
    }

    // Validação básica de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('유효한 이메일을 입력해주세요.');
      return;
    }

    onAdicionar({ Nome: nome.trim(), Email: email.trim() });
    setNome('');
    setEmail('');
  };

  const confirmarRemocao = (pessoa: Pessoa) => {
    setPessoaParaRemover(pessoa);
  };

  const handleRemover = () => {
    if (pessoaParaRemover) {
      onRemover(pessoaParaRemover.PessoaId);
      setPessoaParaRemover(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>팀 관리</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Formulário para adicionar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">새 팀원 추가</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">이름</Label>
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="이름 입력"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="이메일 입력"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAdicionar}
                  className="bg-[#007e7a] hover:bg-[#006662] w-full md:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  팀원 추가
                </Button>
              </CardContent>
            </Card>

            {/* Lista da equipe */}
            <div className="space-y-2">
              <h3 className="text-gray-900">팀원 목록 ({equipe.length})</h3>
              {equipe.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    등록된 팀원이 없습니다.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {equipe.map(pessoa => (
                    <Card key={pessoa.PessoaId} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-600" />
                              <span className="text-gray-900">{pessoa.Nome}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-600" />
                              <span className="text-sm text-gray-600">{pessoa.Email}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmarRemocao(pessoa)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de remoção */}
      <AlertDialog open={!!pessoaParaRemover} onOpenChange={() => setPessoaParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말 <strong>{pessoaParaRemover?.Nome}</strong>님을 팀에서 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemover}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
