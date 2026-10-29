# Plano de implementacao: CRM operacional

## 1. Status deste documento

Este documento organiza a proposta de transformar o LeadFlow em um CRM operacional simples para as equipes de **Externa** e **Telemarketing**.

As funcoes descritas aqui ainda nao foram implementadas. Cada etapa devera ser validada com a operacao antes do desenvolvimento, principalmente as regras de comissao, o alcance da pesquisa entre lojas, as permissoes de acesso e o tratamento de dados pessoais.

O objetivo nao e substituir um CRM completo neste momento. O LeadFlow devera organizar os processos manuais que a empresa ja executa, reduzir cadastros duplicados e indicar com clareza qual e a proxima acao de cada cliente.

## 2. Problemas que o plano pretende resolver

- Um cliente pode ser agendado novamente porque nao informa que ja possui agendamento.
- Cadastros duplicados podem gerar conflitos na atribuicao de comissao.
- A equipe externa nao possui um fluxo unico para pesquisar, visitar, registrar satisfacao e agendar.
- O telemarketing precisa montar manualmente as relacoes de clientes para ligar ou enviar mensagens.
- Confirmacoes, reagendamentos, faltosos e retornos podem ficar dispersos.
- Nao existe uma fila organizada de aniversariantes e outras oportunidades de relacionamento.
- Observacoes livres nao permitem acompanhar com facilidade o estagio, o responsavel e a proxima acao.

## 3. Principios da solucao

1. Pesquisar antes de cadastrar ou agendar.
2. Manter um unico cadastro por cliente sempre que for possivel identifica-lo com seguranca.
3. Reagendar o registro existente em vez de criar outro agendamento.
4. Preservar quem captou, quem agendou e quem reagendou.
5. Registrar alteracoes relevantes em um historico auditavel.
6. Organizar o trabalho por filas e proximas acoes.
7. Manter o envio de mensagens e as ligacoes manuais na primeira versao.
8. Exibir somente os dados necessarios para cada cargo, loja e atividade.

## 4. Usuarios atendidos

### Equipe externa

Profissionais que visitam clientes, realizam pesquisas de satisfacao, identificam interesses e fazem agendamentos.

Necessidades principais:

- pesquisar o cliente antes de iniciar um novo cadastro;
- identificar rapidamente um agendamento existente;
- visualizar um resumo autorizado do cliente;
- reagendar quando houver necessidade e permissao;
- registrar visita, pesquisa, interesse e resultado;
- preservar a autoria da captacao e do agendamento.

### Telemarketing

Profissionais que entram em contato manualmente por ligacao ou mensagem para confirmar, reagendar, recuperar ou cultivar o relacionamento com clientes.

Necessidades principais:

- receber listas prontas de clientes que precisam de contato;
- visualizar dados, agendamentos, historico e proxima acao;
- usar mensagens previamente preparadas;
- registrar o resultado de cada contato;
- acompanhar aniversariantes, confirmacoes, faltosos e retornos.

### Gestao e administracao

Responsaveis por definir permissoes, acompanhar produtividade, analisar conversao e resolver conflitos de atribuicao ou duplicidade.

## 5. Base unica e prevencao de duplicidade

Antes de permitir um novo cadastro ou agendamento, o LeadFlow devera oferecer uma pesquisa por:

- CPF, como identificador principal quando estiver disponivel;
- telefone normalizado;
- nome;
- nome combinado com data de nascimento, como indicio secundario.

O resultado devera informar uma destas situacoes:

- cliente nao encontrado;
- cadastro existente sem agendamento;
- cliente com agendamento ativo;
- cliente com atendimento anterior concluido;
- possivel duplicidade que exige conferencia.

Quando existir um agendamento ativo, o usuario autorizado devera abrir o cadastro existente e reagendar, se necessario. O sistema nao devera criar automaticamente um segundo cadastro.

Correspondencias por nome nao devem ser tratadas como certeza. O usuario devera confirmar outros dados antes de reutilizar o cadastro.

### Privacidade na pesquisa

- CPF e outros documentos nao deverao aparecer integralmente na lista de resultados.
- A pesquisa devera respeitar as lojas e os dados permitidos ao usuario.
- O sistema devera registrar quem pesquisou e quem abriu dados sensiveis quando isso for necessario para auditoria.
- A permissao para pesquisar nao devera conceder automaticamente permissao para editar todos os campos do cadastro.

## 6. Responsabilidade, autoria e comissao

O cadastro devera preservar papeis distintos:

- **Responsavel pela captacao:** quem trouxe ou cadastrou o cliente originalmente.
- **Responsavel pelo agendamento:** quem realizou o agendamento.
- **Responsavel pelo reagendamento:** quem recuperou ou alterou a data posteriormente.
- **Canal de origem:** externa, telemarketing, indicacao, loja ou outro canal configurado.

Um reagendamento nao podera substituir silenciosamente o captador ou o agendador original. Cada alteracao devera guardar usuario, data, hora, valor anterior, valor novo e motivo quando aplicavel.

A regra definitiva de comissao ainda precisa ser decidida pela empresa. O modelo devera fornecer dados para alternativas como:

- comissao do captador original;
- comissao de quem realizou o primeiro agendamento;
- comissao de quem recuperou um cliente faltoso ou cancelado;
- divisao entre captacao e recuperacao;
- nenhuma nova comissao em um simples ajuste de data.

Essa decisao devera ser concluida antes de criar relatorios financeiros ou calculos automaticos de comissao.

## 7. Funil operacional sugerido

O funil devera ser simples e compartilhado entre as equipes, com permissoes e filas adaptadas a cada cargo:

1. **Novo contato**
2. **Aguardando abordagem**
3. **Contato realizado**
4. **Interessado**
5. **Agendado**
6. **Confirmado**
7. **Compareceu**
8. **Faltou**
9. **Reagendar**
10. **Nao interessado**
11. **Encerrado**

O status nao substitui o agendamento atual nem os estados clinicos existentes. Ele representa a etapa de relacionamento do cliente.

### Proxima acao

Cada cliente em acompanhamento devera ter uma proxima acao com responsavel e prazo. Tipos iniciais:

- ligar;
- enviar mensagem;
- confirmar agendamento;
- reagendar;
- visitar;
- realizar pesquisa de satisfacao;
- retornar em uma data definida;
- encerrar acompanhamento.

O sistema devera destacar acoes de hoje, futuras e atrasadas.

## 8. Fluxo da equipe externa

1. Pesquisar o cliente por CPF, telefone ou nome antes de cadastrar.
2. Conferir se existe cadastro ou agendamento ativo.
3. Abrir o cadastro existente quando a identidade for confirmada.
4. Registrar a visita ou abordagem.
5. Preencher uma pesquisa curta quando aplicavel.
6. Registrar interesse e proxima acao.
7. Criar um agendamento somente quando nao existir outro ativo.
8. Reagendar o registro existente quando houver necessidade e permissao.
9. Registrar o resultado final da visita.

### Pesquisa de satisfacao inicial

A pesquisa podera fazer parte do atendimento externo, sem exigir uma nova aba principal na primeira versao. Perguntas sugeridas:

- Ja conhece a empresa?
- Ja comprou ou foi atendido anteriormente?
- Como avalia o atendimento recebido?
- Por que escolheu a empresa?
- Se nao escolheu, qual foi o principal motivo?
- Possui interesse em exame, oculos ou outro servico?
- Autoriza um novo contato?

As respostas deverao usar opcoes padronizadas sempre que forem usadas em indicadores, mantendo observacao livre apenas como complemento.

## 9. Fluxo do telemarketing

O telemarketing devera trabalhar por listas de tarefas geradas a partir dos dados existentes. Filas iniciais:

- contatos previstos para hoje;
- agendamentos aguardando confirmacao;
- clientes que solicitaram reagendamento;
- clientes que faltaram;
- retornos vencidos;
- aniversariantes;
- clientes sem contato ha um periodo definido;
- pesquisas de satisfacao pendentes.

Ao abrir uma tarefa, o usuario devera visualizar:

- identificacao e telefone do cliente;
- loja e responsavel atual;
- agendamento ativo, quando existir;
- historico resumido de contatos;
- proxima acao;
- mensagem pronta relacionada a tarefa.

Resultados iniciais de contato:

- mensagem enviada;
- ligacao atendida;
- nao respondeu;
- confirmou;
- solicitou reagendamento;
- pediu retorno posterior;
- informou falta de interesse;
- numero invalido;
- acompanhamento encerrado.

O LeadFlow apenas organizara e registrara o processo na primeira versao. O envio de WhatsApp e as ligacoes continuarao manuais.

## 10. Aniversariantes e relacionamento

Criar uma lista diaria e mensal de aniversariantes contendo:

- nome;
- telefone;
- data de nascimento;
- loja de referencia;
- responsavel;
- ultima compra ou atendimento, quando disponivel;
- mensagem pronta;
- situacao do contato.

Situacoes iniciais:

- pendente;
- mensagem enviada;
- cliente respondeu;
- sem resposta;
- contato nao realizado.

Voucher ou cashback poderao comecar como uma oferta registrada manualmente, com texto e codigo opcional. Regras financeiras, validade e resgate deverao ser detalhados antes de qualquer automacao.

## 11. Organizacao sugerida na interface

Criar uma area **Relacionamento** dentro de **Gestao**, evitando adicionar imediatamente um quinto item a navegacao principal.

Visoes sugeridas:

- **Minha fila:** tarefas atribuidas ao usuario, organizadas por prazo e prioridade.
- **Clientes:** pesquisa, resumo, historico e proxima acao.
- **Campanhas:** aniversariantes, confirmacoes, faltosos e outras listas de trabalho.

No cadastro do cliente, adicionar progressivamente:

- etapa do funil;
- responsavel atual;
- origem;
- proxima acao e prazo;
- agendamentos;
- historico de contatos;
- pesquisa de satisfacao;
- historico auditavel de alteracoes.

## 12. Permissoes iniciais sugeridas

### Externa

- pesquisar clientes nas lojas autorizadas;
- visualizar resumo e situacao do agendamento;
- criar cadastro quando nao houver correspondencia confirmada;
- registrar visita, pesquisa, interesse e proxima acao;
- criar ou reagendar conforme permissao especifica;
- nao alterar autoria original nem dados administrativos.

### Telemarketing

- consultar suas filas e clientes das lojas autorizadas;
- visualizar telefone, agendamento e historico necessario ao contato;
- registrar tentativa, resultado e proxima acao;
- confirmar e reagendar conforme permissao especifica;
- nao alterar autoria original nem regras de comissao.

### Gestor

- consultar filas e resultados da equipe;
- redistribuir responsaveis;
- revisar possiveis duplicidades;
- consultar historico e autoria;
- corrigir dados permitidos sem apagar eventos anteriores.

### Administrador

- configurar permissoes, canais, motivos, campanhas e mensagens;
- consultar auditoria completa;
- executar correcoes excepcionais identificadas no historico.

## 13. Etapas de execucao

### Etapa 1: pesquisa e prevencao de duplicidade

Objetivo: impedir novos agendamentos duplicados antes de ampliar o CRM.

- [ ] Definir o alcance da pesquisa entre lojas.
- [ ] Normalizar CPF, telefone, nome e data de nascimento.
- [ ] Criar pesquisa por CPF, telefone e nome.
- [ ] Exibir a situacao do cadastro e do agendamento encontrado.
- [ ] Mascarar documentos nos resultados.
- [ ] Permitir abrir o cadastro existente conforme permissao.
- [ ] Direcionar para reagendamento quando ja houver agendamento ativo.
- [ ] Criar regras e testes de permissao no Firestore.
- [ ] Validar em celular e computador.

### Etapa 2: autoria, historico e base para comissao

Objetivo: preservar com seguranca quem executou cada parte do processo.

- [ ] Separar captador, agendador e responsavel pelo reagendamento.
- [ ] Padronizar os canais de origem.
- [ ] Criar historico imutavel das principais alteracoes.
- [ ] Registrar motivo de reagendamento, cancelamento ou encerramento.
- [ ] Definir a regra empresarial de comissao.
- [ ] Atualizar exportacoes e relatorios sem recalcular o passado.

### Etapa 3: funil e proxima acao

Objetivo: organizar o acompanhamento sem depender de observacoes livres.

- [ ] Validar os estados do funil com as equipes.
- [ ] Adicionar etapa de relacionamento ao cliente.
- [ ] Adicionar responsavel, proxima acao e prazo.
- [ ] Destacar tarefas atrasadas, de hoje e futuras.
- [ ] Registrar mudancas de etapa no historico.
- [ ] Definir regras para encerramento e reabertura.

### Etapa 4: fila do telemarketing

Objetivo: entregar relacoes prontas para o trabalho manual diario.

- [ ] Criar a visao **Minha fila**.
- [ ] Gerar filas de confirmacao, reagendamento, faltosos e retornos.
- [ ] Permitir registrar resultado do contato.
- [ ] Criar mensagens prontas configuraveis.
- [ ] Permitir redistribuicao de tarefas pelo gestor.
- [ ] Evitar que o mesmo cliente receba tarefas conflitantes.

### Etapa 5: fluxo da equipe externa

Objetivo: unir pesquisa, visita, satisfacao e agendamento em um unico processo.

- [ ] Criar registro de visita ou abordagem.
- [ ] Implementar pesquisa curta de satisfacao.
- [ ] Registrar interesse, autorizacao de contato e proxima acao.
- [ ] Integrar a pesquisa de duplicidade antes do cadastro.
- [ ] Preservar autoria ao reutilizar ou reagendar um cadastro existente.
- [ ] Criar indicadores de visitas, interesses e agendamentos.

### Etapa 6: aniversariantes e campanhas manuais

Objetivo: organizar acoes recorrentes de relacionamento.

- [ ] Criar lista diaria e mensal de aniversariantes.
- [ ] Criar mensagem pronta de aniversario.
- [ ] Registrar envio, resposta e ausencia de contato.
- [ ] Definir regras de voucher ou cashback antes de disponibiliza-los.
- [ ] Criar campanhas manuais para outros grupos autorizados.

### Etapa 7: indicadores e melhoria continua

Objetivo: medir o processo sem alterar os registros historicos.

- [ ] Cadastros duplicados evitados.
- [ ] Conversao por canal de origem.
- [ ] Conversao por equipe e responsavel.
- [ ] Agendamentos, confirmacoes, reagendamentos e recuperacoes.
- [ ] Comparecimentos e faltas.
- [ ] Tarefas concluidas, atrasadas e sem resposta.
- [ ] Motivos de interesse, perda e nao escolha.
- [ ] Resultados das pesquisas de satisfacao.

## 14. Ordem de prioridade recomendada

1. Pesquisa e prevencao de duplicidade.
2. Autoria, historico e base para comissao.
3. Funil e proxima acao.
4. Fila do telemarketing.
5. Fluxo da equipe externa e pesquisa de satisfacao.
6. Aniversariantes e campanhas manuais.
7. Indicadores consolidados.

Essa ordem protege primeiro a operacao e a comissao. Depois cria a estrutura de acompanhamento e, por ultimo, amplia campanhas e analises.

## 15. Decisoes necessarias antes da implementacao

- A pesquisa de duplicidade consultara todas as lojas ou somente as permitidas ao usuario?
- Quais dados a equipe externa podera visualizar ao encontrar um cliente de outra loja?
- Quem podera reagendar sem aprovacao de um gestor?
- Qual evento gera comissao: captacao, primeiro agendamento, comparecimento ou recuperacao?
- Um reagendamento pode gerar nova comissao? Em quais situacoes?
- Quais estados do funil serao obrigatorios na primeira versao?
- Qual prazo define um retorno atrasado ou um cliente sem contato recente?
- Quem sera o responsavel padrao por aniversariantes?
- Quais mensagens prontas serao aprovadas pela empresa?
- Qual sera o prazo de retencao do historico, das pesquisas e dos registros de contato?
- Como sera tratada a autorizacao do cliente para novos contatos?

## 16. Criterios gerais de conclusao

Uma etapa somente devera ser considerada concluida quando:

- as regras de negocio estiverem aprovadas pela operacao;
- as permissoes estiverem cobertas por regras e testes do Firestore;
- os fluxos funcionarem em celular e computador;
- alteracoes relevantes forem registradas no historico;
- dados sensiveis nao forem expostos fora do necessario;
- registros existentes continuarem compativeis;
- os principais cenarios tiverem testes automatizados;
- a equipe responsavel tiver validado o fluxo com dados de teste.
