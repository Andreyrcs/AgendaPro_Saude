// Perfil familiar: o paciente gerencia filhos, pais e outros dependentes (Apêndice L).
// Regra de negócio: cada conta só enxerga e altera a própria família (a API confere pelo token).
// Rotas: GET e POST /api/pacientes/{id}/familiares ({id} = idUsuario da sessão).

import { chamarApi } from './api';
import { idadeEm } from '../utilitarios/datas';
import { soDigitos } from '../utilitarios/validacao';

// Formato de cada familiar (o da API): { id, nome, curto, cpf, relacao, nascimento, cor, alergias, titular }
// O app acrescenta "idade", calculada do nascimento (a pediatria e o assistente usam).
// Alergias nulas aparecem como "Nenhuma informada" só na tela.
function comIdade(p) {
  return { ...p, idade: p.nascimento ? idadeEm(p.nascimento) : null, alergias: p.alergias || 'Nenhuma informada' };
}

export async function listarFamiliares(usuario) {
  const lista = await chamarApi(`/api/pacientes/${usuario.idUsuario}/familiares`);
  return lista.map(comIdade);
}

// dados = { nome, cpf, relacao, nascimento: 'AAAA-MM-DD', alergias, cor }
// Os erros vêm prontos da API, como "CPF inválido." ou "Este CPF já está cadastrado."
export async function adicionarFamiliar(usuario, dados) {
  const familiar = await chamarApi(`/api/pacientes/${usuario.idUsuario}/familiares`, {
    metodo: 'POST',
    corpo: {
      nome: (dados.nome || '').trim(),
      cpf: soDigitos(dados.cpf),
      relacao: dados.relacao,
      nascimento: dados.nascimento,
      alergias: (dados.alergias || '').trim() || null,
      cor: dados.cor || null,
    },
  });
  return comIdade(familiar);
}
