# Plano futuro - Evolucoes operacionais do lead

## 1. Status deste documento

Este documento registra ideias para evolucoes futuras do FascinLead. As funcoes descritas abaixo ainda nao fazem parte do comportamento atual e nao estao autorizadas para implementacao imediata.

Antes de iniciar qualquer item, o escopo devera ser validado com a operacao, detalhado no TDD e acompanhado por regras de acesso, modelo de dados, impactos de privacidade e testes.

## 2. Ordem de prioridade sugerida

1. Historico completo do lead.
2. Deteccao de duplicidade.
3. Confirmacao de agendamento.
4. Motivo de cancelamento ou perda.
5. Lista de espera.
6. Alertas de capacidade.
7. Busca global.

Essa ordem prioriza rastreabilidade e qualidade dos dados antes de novas automacoes.

## 3. Historico completo do lead

Criar uma linha do tempo auditavel dentro do cadastro, sem substituir os dados atuais do lead. O historico devera registrar:

- criacao do cadastro, com data, origem e responsavel;
- alteracoes de nome, telefone, loja, servico, data e horario;
- tentativas de contato e inicio de conversa pelo WhatsApp;
- confirmacao, recusa, comparecimento, falta, cancelamento e reagendamento;
- encaminhamento para oftalmologista;
- solicitacao e alteracoes relacionadas ao transporte;
- usuario responsavel, data e hora de cada acao;
- valores anteriores e novos somente quando forem necessarios para auditoria.

O historico devera ser somente leitura na interface comum. Correcoes administrativas nao poderao apagar silenciosamente eventos anteriores. Dados sensiveis deverao ter acesso restrito e prazo de retencao definido.

## 4. Deteccao de duplicidade

Antes de concluir um cadastro, o sistema podera procurar registros existentes por:

- telefone normalizado;
- CPF, quando informado;
- RG, quando informado;
- combinacao de nome e data de nascimento como indicio secundario.

Uma correspondencia nao devera bloquear automaticamente o trabalho. A interface devera mostrar os possiveis cadastros duplicados e permitir ao usuario autorizado abrir o registro existente, continuar mesmo assim ou cancelar a nova inclusao. CPF e RG nao deverao ser exibidos integralmente em listas de sugestoes.

Tambem devera ser decidido se a verificacao considera somente a loja atual ou todas as unidades permitidas ao usuario.

## 5. Motivo de cancelamento ou perda

Ao cancelar um agendamento ou encerrar um lead sem conversao, o sistema podera solicitar um motivo padronizado e uma observacao opcional. Exemplos iniciais:

- cliente desistiu;
- nao foi possivel entrar em contato;
- horario incompativel;
- transporte indisponivel;
- atendimento realizado em outro local;
- cadastro duplicado;
- outro motivo.

Os motivos deverao alimentar relatorios sem apagar o cadastro ou seu historico.

## 6. Confirmacao de agendamento

Adicionar um estado de confirmacao independente do comparecimento:

- aguardando confirmacao;
- confirmado;
- recusado;
- sem resposta;
- reagendamento solicitado.

O registro devera guardar quando ocorreu a confirmacao, por qual canal e quem a registrou. Alterar esse estado nao devera consumir uma nova cota nem criar outro agendamento, exceto quando houver reagendamento confirmado.

## 7. Lista de espera

Permitir que leads sem horario adequado entrem em uma lista de espera por loja, servico, profissional, periodo do dia e intervalo de datas. Quando uma vaga for liberada, o sistema podera sugerir candidatos compativeis.

A primeira versao devera apenas sugerir e avisar; nao devera reservar automaticamente. A vaga so sera ocupada depois da confirmacao do cliente e da reserva normal dos blocos de agenda.

## 8. Alertas de capacidade

Exibir avisos preventivos quando a operacao estiver proxima ou tiver atingido limites como:

- vagas da loja por dia;
- cotas do MEI por dia e turno;
- capacidade de transporte;
- disponibilidade do oftalmologista;
- quantidade minima de passageiros para uma viagem;
- ocupacao dos servicos e blocos de horario.

Os limites de alerta deverao ser configuraveis. Avisos nao poderao liberar reservas acima das regras existentes; excecoes dependerao de permissao explicita e deverao ser auditadas.

## 9. Busca global

Criar uma busca unica para localizar rapidamente um lead por nome, nome preferido, telefone, CPF ou RG. Os resultados deverao respeitar as mesmas permissoes de loja e alcance de dados usadas nas demais telas.

A busca devera:

- normalizar telefone e documentos;
- aceitar correspondencia parcial de nome;
- indicar loja, captador e situacao atual;
- evitar expor documentos completos na lista;
- abrir o cadastro autorizado sem duplicar dados.

## 10. Decisoes necessarias antes da implementacao

- prazo de retencao do historico e dos eventos de auditoria;
- perfis autorizados a consultar cada tipo de evento;
- alcance da verificacao de duplicidade entre lojas;
- catalogo definitivo de motivos de cancelamento e perda;
- canais usados para confirmacao e notificacao;
- regra de prioridade da lista de espera;
- limites e destinatarios dos alertas de capacidade;
- estrategia de indexacao e custo da busca global no Firebase ou em servico externo.

