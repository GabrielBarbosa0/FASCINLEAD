# FascinLead - Technical Design Document

| Campo | Valor |
| --- | --- |
| Documento | Technical Design Document (TDD) |
| Projeto | FascinLead |
| Versao | 2.0 |
| Status | Em implementacao |
| Data | 22/10/2026 |
| Responsavel | Oticas Fascinante |

### Manutencao deste documento

- O TDD e a fonte tecnica principal do FascinLead e descreve o comportamento implementado, nao apenas intencoes futuras.
- Toda entrega que altere arquitetura, fluxo offline, autorizacao, modelo de dados, agenda, integracoes, seguranca ou requisitos permanentes deve atualizar este arquivo na mesma alteracao.
- Decisoes ainda nao implementadas devem ser identificadas como proposta ou pendencia; nao podem ser descritas como comportamento atual.
- A versao deve subir quando houver mudanca estrutural. A data deve refletir a ultima revisao funcional relevante.
- Codigo, regras do Firestore e testes prevalecem como evidencia durante auditorias; divergencias encontradas devem ser reconciliadas no TDD antes de concluir a tarefa.

## 1. Visao geral

O FascinLead e uma aplicacao web progressiva (PWA) para substituir fichas de papel usadas por colaboradores durante a captacao de potenciais clientes na rua.

O sistema permite o cadastro rapido mesmo sem internet. Quando a conexao e restabelecida, os registros pendentes sao sincronizados com a nuvem. A reserva de data e horario exige confirmacao online da agenda para evitar dupla ocupacao. O produto nao e um CRM completo: seu foco e registrar, consultar, agendar e encaminhar contatos captados para a equipe responsavel.

### 1.1 Objetivos

- Reduzir o tempo gasto no cadastro durante uma abordagem.
- Eliminar perda, rasura e digitacao posterior de fichas em papel.
- Permitir uso confiavel sem internet.
- Identificar colaborador, loja, data e origem de cada captacao.
- Centralizar os registros na nuvem quando houver conexao.
- Entregar uma interface simples para celular e instalavel como aplicativo.
- Manter o consumo do Firebase previsivel e dentro das cotas definidas para o piloto, aprovando previamente qualquer recurso faturavel.
- Permitir encaminhamento incremental e seguro dos leads para CRMs externos, sem transformar o FascinLead em CRM.

### 1.2 Fora do escopo

- CRM completo, funil comercial ou automacao de vendas.
- Atendimento ou campanhas pelo WhatsApp.
- Confirmacoes automaticas antes de consultas e exames. O pre-agendamento pode ser consultado na agenda, e faltas confirmadas geram retorno interno para o captador.
- Anamnese, recomendacao de lentes ou provador virtual.
- Metas de vendas, comissoes, faturamento ou conciliacao de vendas. Metas de quantidade de leads captados estao no escopo.
- Integracoes de escrita com SavWin, AppOk ou CRMs externos.
- Automacoes, funis e operacao de CRM dentro do FascinLead; a API de saida de leads e uma fronteira de integracao aprovada.
- Envio de notificacoes push na primeira versao.
- Funcionamento como aplicativo nativo publicado nas lojas Android e iOS.

## 2. Usuarios e permissoes

| Perfil | Responsabilidade | Permissoes iniciais |
| --- | --- | --- |
| Colaborador | Realizar abordagens na rua | Criar, consultar e corrigir os proprios cadastros; realizar retornos e acompanhar as proprias metas |
| MEI | Atuar como captador externo | Mesmas permissoes iniciais do colaborador, com dias e cotas de agendamento configuraveis por loja e periodo do dia |
| Atendente de balcao | Operar a agenda da unidade | Criar cadastros, consultar a agenda e registrar comparecimento ou falta |
| Gestor de unidades | Acompanhar unidades permitidas | Consultar e exportar registros, administrar metas, agenda, relatorios e retornos conforme as permissoes ativas |
| Administrador | Administrar o FascinLead | Todas as permissoes sempre ativas; gerencia acessos, cargos, configuracoes, metas e todos os registros |

Os perfis padrao podem ter permissoes restauradas ao padrao; perfis personalizados possuem nome, alcance (`own` ou `stores`) e permissoes editaveis. O perfil Administrador nao pode perder permissoes. As permissoes sao aplicadas pelas regras do Firestore; ocultar botoes na interface nao substitui a autorizacao no banco.

## 3. Requisitos funcionais

### RF-01 - Autenticacao

- O acesso pode ser feito por e-mail e senha ou por uma conta Google autorizada.
- O primeiro login de um dispositivo exige internet.
- Apenas e-mails previamente autorizados poderao utilizar o sistema.
- A sessao devera permanecer salva no dispositivo para usos posteriores.
- Usuarios inativos deverao perder acesso na proxima verificacao online.
- Contas operacionais criadas pela administracao recebem inicialmente a senha padrao `mudar123`, exceto o administrador; o usuario pode altera-la pelo fluxo de recuperacao de senha.

### RF-02 - Novo cadastro

Campos minimos propostos:

| Campo | Obrigatorio | Regra |
| --- | --- | --- |
| Nome | Sim | Entre 2 e 120 caracteres |
| Telefone/WhatsApp | Sim | Normalizado para telefone brasileiro |
| RG | Nao | Texto normalizado; placeholder `0.000.000` |
| CPF | Nao | Validado quando informado |
| Data de nascimento | Nao | Calcula a idade para regras de triagem |
| Sexo | Nao | Valor enumerado |
| Apelido | Nao | Ate 60 caracteres |
| Rua e numero | Nao | Numero vazio e normalizado como `S/N` |
| Bairro | Nao | Ate 80 caracteres |
| Cidade | Nao | Ate 80 caracteres |
| UF | Nao | Duas letras; padrao configuravel por loja |
| Interesse principal | Nao | Opcao de uma lista administrada pelo sistema |
| Servico | Nao | Servico ativo e disponivel na unidade, com duracao propria |
| Ametropias | Nao | Exibicao configuravel por loja |
| Patologias | Nao | Opcoes clinicas usadas pela triagem |
| Cirurgia nos olhos | Condicional | Obrigatoria a partir da idade configurada; informa o tipo quando a resposta for positiva |
| Transporte | Nao | Sem transporte ou com transporte; aceita no maximo um acompanhante |
| Data do pre-agendamento | Nao | Data prevista; exige horario quando informada |
| Horario do pre-agendamento | Nao | Horario previsto; exige data quando informado |
| Observacao rapida | Nao | Ate 500 caracteres |

O sistema preenchera automaticamente:

- identificador do registro;
- colaborador responsavel;
- loja do colaborador;
- data e hora da captacao no dispositivo;
- origem `rua`;
- versao do esquema e versao do aplicativo.

Receita, fotos e geolocalizacao exata nao fazem parte do MVP. CPF, RG e os dados clinicos estritamente necessarios a triagem foram incorporados e devem receber o mesmo tratamento de seguranca e minimizacao dos demais dados pessoais.

### RF-03 - Operacao offline

- O formulario devera abrir e salvar sem conexao depois que o aplicativo tiver sido carregado ao menos uma vez.
- Um registro salvo offline devera aparecer imediatamente em `Meus cadastros`.
- Sem conexao confirmada com o Firestore, data e horario ficam bloqueados e vazios; o usuario salva o lead, nao um agendamento.
- O lead sem agenda aparece em `Meus cadastros` e em `Sync` como `Aguardando agendamento`.
- O usuario devera enxergar claramente se cada item esta pendente, sincronizando, sincronizado ou com erro.
- Fechar e reabrir o aplicativo nao podera apagar registros pendentes.

### RF-04 - Sincronizacao

A sincronizacao sera tentada:

- automaticamente ao salvar quando houver internet;
- ao abrir o aplicativo;
- quando o navegador disparar o evento `online`;
- quando o aplicativo voltar ao primeiro plano;
- pelo comando manual `Sincronizar agora`.

`navigator.onLine` e apenas um sinal de interface. A liberacao dos campos da agenda exige um snapshot do servidor (`fromCache === false`) tanto para a configuracao da loja quanto para os compromissos do dia.

O navegador nao garante execucao quando o PWA estiver completamente fechado. Portanto, o sistema nao dependera de Background Sync para cumprir sua funcao principal.

### RF-05 - Meus cadastros

- Listar os registros criados pelo usuario no dispositivo e/ou carregados de sua conta.
- Buscar por nome ou telefone.
- Filtrar por estado de sincronizacao e data.
- Permitir correcao de dados pelo proprio captador.
- Nao permitir exclusao definitiva pelo captador no MVP.

### RF-06 - Visao do gestor

- Consultar registros da loja por periodo e captador.
- Buscar por nome ou telefone.
- Exibir totais por dia e colaborador.
- Exportar CSV detalhado, com uma linha por captacao e somente dados pertencentes ao escopo do FascinLead.
- Permitir que administradores visualizem, corrijam e excluam qualquer lead.
- Manter gestores somente com consulta e exportacao dos leads da propria loja.
- Paginar resultados para evitar leituras desnecessarias no Firestore.

O CSV detalhado inclui identificadores do lead e do captador, dados do cliente, loja, data e hora da captacao, pre-agendamento opcional, comparecimento, interesse, endereco, origem e observacoes. Nao inclui consentimento, status de funil, etapa de Kanban, venda ou valor, pois esses dados nao sao controlados pelo FascinLead.

Esta tela e administrativa e nao transforma o produto em CRM: nao havera etapas de funil, tarefas comerciais ou historico de atendimento.

### RF-07 - Administracao basica

- Autorizar ou bloquear um e-mail.
- Vincular usuario a uma loja e perfil.
- Permitir que apenas administradores criem ou alterem acessos pela interface.
- Sincronizar perfil, loja e estado entre `allowedEmails` e um usuario que ja realizou o primeiro login.
- Impedir que o administrador bloqueie ou remova o proprio perfil administrativo.
- Manter `oticasfascinantes.financeiro@gmail.com` como conta administradora principal de recuperacao, sempre sujeita ao login Google verificado.
- Ativar ou inativar uma loja.
- Manter a lista de interesses disponiveis no formulario.

O cadastro e o bloqueio de acessos sao feitos na tela `Acessos da equipe`. Lojas e interesses ainda podem ser mantidos diretamente no Firebase Console durante o MVP.

### RF-08 - Metas de captacao

- Administradores podem criar metas de quantidade de leads para captadores de qualquer loja.
- Gestores podem criar metas somente para captadores ativos da propria loja.
- Uma mesma configuracao pode ser atribuida a um ou mais captadores, gerando uma meta individual para cada pessoa.
- Captadores visualizam somente as proprias metas e o proprio progresso.
- Gestores visualizam somente metas e desempenho da propria equipe; administradores visualizam todas as lojas.
- O progresso considera somente leads sincronizados, atribuidos ao captador e cuja data de captacao esteja dentro do periodo da meta.
- Metas podem ser excluidas por administradores ou pelo gestor da loja correspondente sem alterar os leads contabilizados.
- Ranking, premiacoes e gamificacao ficam reservados para uma etapa posterior.

### RF-09 - Agenda gerencial de exames

- Gestores e administradores visualizam em calendario mensal os leads que possuem data e horario de pre-agendamento.
- O gestor consulta somente os pre-agendamentos da propria loja.
- O administrador consulta todas as lojas ou filtra pelas lojas 02, 04, 05 e 06.
- Cada dia informa a quantidade de exames e apresenta os detalhes em ordem de horario.
- Enquanto a agenda estiver aberta, novos pre-agendamentos e alteracoes aparecem em tempo real, sem recarregar a pagina.
- Gestores podem marcar cada agendamento como `Compareceu` ou `Nao compareceu`; enquanto nenhuma opcao for escolhida, o estado e `Aguardando`.
- A alteracao de comparecimento registra data e usuario responsavel e nao concede ao gestor permissao para editar os demais dados do lead.
- A agenda reutiliza os campos do lead e nao cria uma segunda fonte de dados.
- Uma falta aparece em `Retornos` para o captador responsavel depois da tolerancia configurada para a loja.
- Quando a automacao da loja estiver ativa, um agendamento ainda sem confirmacao tambem aparece em `Retornos` depois da tolerancia.
- Agendamentos sem confirmacao nao geram retorno automatico quando a chave da loja estiver desativada.
- O retorno oferece uma mensagem pronta no WhatsApp e desaparece quando o cliente e reagendado.
- Ao abrir o WhatsApp, o sistema registra o inicio do contato para o agendamento atual.
- O gestor acompanha, em modo somente leitura, os retornos da propria loja agrupados por captador e o estado de cada contato; o administrador possui a mesma visao para todas as lojas.
- O administrador configura, em `Acessos da equipe`, uma ou mais unidades permitidas para cada gestor. O administrador nao possui restricao de unidade e o captador permanece vinculado somente a loja principal.
- A consulta e limitada a um mes e a 500 resultados para preservar as cotas gratuitas do Firestore.
- Administradores configuram por loja o modo controlado ou livre, a duracao da consulta e o inicio e fim do expediente.
- O modo controlado e o padrao e oferece ao captador somente intervalos livres que caibam integralmente no expediente.
- Um intervalo ocupado deixa de ser oferecido aos demais captadores assim que o agendamento aparece no Firestore.

### RF-10 - Servicos e reserva por blocos

- Administradores cadastram, editam, ativam, inativam e excluem servicos.
- Cada servico possui nome, duracao em multiplos de 10 minutos e unidades atendidas.
- A agenda usa blocos basicos de 10 minutos. Um servico ocupa a quantidade necessaria de blocos consecutivos.
- O inicio pode ocorrer em qualquer bloco livre no qual o servico caiba integralmente no expediente.
- As cotas contam clientes/agendamentos, nao blocos de tempo.
- Agendamentos anteriores ao modelo por blocos sao preservados e considerados no calculo de ocupacao.

### RF-11 - Configuracao detalhada da agenda

- Cada loja possui escala semanal propria, com dias ativos e horarios de inicio e fim independentes.
- Limites de vagas podem ser configurados por dia da semana, com capacidade diferente em cada dia.
- O cargo MEI pode ser limitado a dias especificos e cotas diferentes para manha e tarde em cada dia.
- A cota consumida e determinada pelo horario do atendimento agendado, nao pelo horario em que o captador realizou o cadastro.
- O alerta de atraso e o limite para sugerir reagendamento sao tempos separados.

### RF-12 - Triagem oftalmologica

- A partir da idade configurada, inicialmente 55 anos, o formulario exige informar se o cliente realizou cirurgia nos olhos.
- Quando a resposta for positiva, o tipo da cirurgia e obrigatorio.
- Catarata informada como patologia ou cirurgia encaminha automaticamente ao oftalmologista, salvo alteracao manual por perfil autorizado.
- A agenda oftalmologica possui escala semanal propria por loja e mostra apenas dias e horarios compativeis.
- Novos criterios clinicos devem ser adicionados por configuracao e validacao, sem espalhar condicionais pela interface.

### RF-13 - Transporte

- O lead informa se precisa de transporte e se levara um acompanhante, limitado a um.
- O consumo de capacidade e representado por `transportSeats`: um assento para o cliente e dois com acompanhante.
- Cada loja configura os dias e horarios em que o transporte esta disponivel.
- Um agendamento com transporte so pode usar data e intervalo integralmente compativeis com essa escala.
- Capacidade do veiculo, numero minimo de passageiros e fechamento de viagens permanecem pendentes de definicao operacional.

### RF-14 - Relatorios e dashboard

- Perfis autorizados consultam indicadores por periodo, unidade e captador.
- Os relatorios exibem cadastros, agendamentos, comparecimentos, faltas e taxa de comparecimento.
- A analise inclui distribuicao de agendamentos por dia da semana e periodo do dia.
- O seletor de periodo usa data inicial, data final e aplicacao explicita do intervalo.

### RF-15 - Perfis e permissoes

- O sistema fornece os perfis padrao Colaborador, MEI, Gestor de unidades, Atendente de balcao e Administrador.
- Perfis nao administrativos podem ter permissoes ativadas ou desativadas individualmente.
- Perfis personalizados podem ser criados, editados e inativados com nome, alcance e permissoes proprias.
- Os perfis padrao possuem acao de restauracao; Administrador conserva todas as permissoes.
- Dependencias de permissao sao normalizadas, por exemplo relatorios e dashboard exigem acesso a gestao.

## 4. Requisitos nao funcionais

| Categoria | Requisito |
| --- | --- |
| Plataforma | Chrome/Edge Android como alvo principal; Safari iOS e navegadores desktop como alvos secundarios |
| Responsividade | Interface utilizavel a partir de 360 px de largura |
| Desempenho | Formulario interativo em ate 3 segundos em conexao movel apos o primeiro acesso |
| Gravacao local | Confirmacao visual em ate 1 segundo em aparelho compativel |
| Confiabilidade | Um cadastro confirmado nao pode desaparecer por falha temporaria de rede |
| Acessibilidade | Controles com rotulos, foco visivel, contraste adequado e alvos de toque de pelo menos 44 px |
| Seguranca | Negacao por padrao, menor privilegio e validacao de campos nas regras do Firestore |
| Privacidade | Coleta minima e ausencia de dados pessoais em logs tecnicos |
| Manutencao | JavaScript modular, formatacao automatica e testes dos fluxos criticos |

## 5. Arquitetura implementada

```text
+------------------------------+
| Celular do colaborador       |
|                              |
| HTML + CSS + JavaScript      |
| PWA / Service Worker         |
| Firebase Auth                |
| Firestore SDK + IndexedDB    |
+---------------+--------------+
                |
                | HTTPS, quando online
                v
+------------------------------+
| Firebase                     |
|                              |
| Authentication (Google)      |
| Cloud Firestore              |
| Firebase Hosting             |
| Security Rules               |
+---------------+--------------+
                |
                v
+------------------------------+
| Gestor / Administrador       |
| Consulta e exportacao CSV    |
+------------------------------+
```

### 5.1 Tecnologias

| Camada | Tecnologia | Motivo |
| --- | --- | --- |
| Interface | HTML5, CSS3 e JavaScript ES Modules | Mantem o projeto pequeno e sem framework de UI |
| Ferramentas | Node.js LTS, npm e Vite | Servidor local, empacotamento e build estatico |
| Icones | Lucide | Biblioteca consistente, leve e acessivel |
| PWA | Web App Manifest e Service Worker | Instalacao, cache do app shell e abertura offline |
| Login | Firebase Authentication com Google e E-mail/Senha | Login conhecido, contas operacionais e persistencia de sessao |
| Dados | Cloud Firestore | Persistencia offline no navegador e sincronizacao automatica |
| Hospedagem | Firebase Hosting | HTTPS, CDN e deploy estatico |
| Funcao administrativa | Firebase Functions callable | Redefinicao de senha de membros por administrador, sem expor credenciais privilegiadas no cliente |
| Testes unitarios | Vitest | Integracao simples com o Vite |
| Testes de interface | Playwright | Validacao dos fluxos online, offline e responsivos |
| Testes locais Firebase | Firebase Emulator Suite | Testes sem consumir cota e validacao das regras |

Cloud Run, Storage e extensoes pagas nao fazem parte do MVP. Firebase Functions e usada somente para a operacao administrativa de senha; sua publicacao exige confirmar previamente o plano e o custo do projeto Firebase.

### 5.2 API de integracao com CRM

O ambiente de desenvolvimento disponibiliza uma API Node local e somente leitura sob `/api/v1`. Ela permite que um CRM consulte leads por pagina, loja e instante da ultima atualizacao. A consulta incremental usa `updatedAtServer`, de modo que correcoes, comparecimento e inicio de retorno reaparecem para o consumidor.

A API nao faz parte do bundle da PWA nem do GitHub Pages. A versao local usa Firebase Admin com Firestore Emulator, Application Default Credentials ou conta de servico mantida fora do repositorio. Uma publicacao futura exigira um backend HTTPS, armazenamento seguro de segredos, rotacao de tokens, limites de requisicao e auditoria; essa publicacao nao sera feita no plano Spark sem decisao explicita sobre custos.

O contrato inicial e versionado em `/api/v1` e documentado em `docs/fascinlead-api.openapi.yaml`. CPF e informacoes de saude ficam excluidos por padrao e exigem habilitacao no servidor e solicitacao explicita do consumidor.

### 5.3 Estrutura atual de diretorios

```text
FASCINLEAD/
|-- docs/
|   |-- TDD.md
|   |-- PLANO-PRE-ATENDIMENTO-CLINICO.md
|   `-- PLANO-SERVICOS-AGENDA.md
|-- functions/
|   `-- index.js
|-- public/
|   |-- icons/
|   |-- manifest.webmanifest
|   `-- offline.html
|-- scripts/
|   |-- migrate-appointment-blocks.js
|   |-- migrate-appointment-services.js
|   |-- reset-team-default-password.js
|   `-- sync-captar-team.js
|-- server/
|   |-- fascinlead-api.js
|   |-- lead-api-contract.js
|   `-- savwin-local-proxy.js
|-- src/
|   |-- app/
|   |   |-- app.js
|   |   |-- pwa.js
|   |   `-- router.js
|   |-- firebase/
|   |   |-- auth.js
|   |   `-- client.js
|   |-- services/
|   |   |-- lead-service.js
|   |   |-- schedule-service.js
|   |   |-- service-catalog-service.js
|   |   |-- role-profile-service.js
|   |   `-- demais servicos de dominio
|   |-- styles/
|   |-- utils/
|   `-- main.js
|-- tests/
|   |-- e2e/
|   |-- rules/
|   `-- unit/
|-- firestore.indexes.json
|-- firestore.rules
|-- firebase.json
|-- index.html
|-- package.json
`-- vite.config.js
```

## 6. Experiencia e navegacao

### 6.1 Telas do MVP

1. `Login`: entrar com Google ou e-mail e senha e informar quando a conta nao estiver autorizada.
2. `Inicio`: atalhos, usuario/loja, conectividade e quantidade pendente.
3. `Novo`: formulario curto de cadastro.
4. `Cadastros`: lista pesquisavel dos registros do colaborador.
5. `Sincronizacao`: totais, ultimo envio, erros e acao manual.
6. `Gestao`: filtros, totais e exportacao para perfis autorizados.
7. `Acessos`: autorizacao, alteracao de perfil/loja e bloqueio de usuarios por administradores.
8. `Agenda`: calendario mensal dos pre-agendamentos para gestores e administradores.
9. `Retornos`: faltas vencidas, acesso do captador ao WhatsApp e acompanhamento da equipe pelo gestor.
10. `Configuracoes`: modo de agenda, duracao da consulta, expediente e tolerancia para faltas por loja, restritos a administradores.

### 6.2 Navegacao mobile

A barra inferior tera quatro destinos: `Inicio`, `Novo`, `Cadastros` e `Sync`. A acao principal `Novo` deve ficar disponivel em um toque a partir de qualquer tela principal.

### 6.3 Estado de conectividade

O selo `Online` ou `Offline` descrevera apenas a conectividade detectada pelo navegador. Ele nao comprova que o Firebase esta acessivel. O resultado real da sincronizacao devera ser mostrado separadamente.

## 7. Modelo de dados

### 7.1 Colecao `stores`

```json
{
  "code": "LOJA_06",
  "name": "Loja 06",
  "defaultCity": "",
  "defaultState": "PE",
  "schedulingMode": "controlled",
  "appointmentDurationMinutes": 20,
  "storeHoursRules": [{ "weekday": 1, "openingTime": "08:00", "closingTime": "18:00" }],
  "noShowGraceMinutes": 5,
  "rescheduleAfterMinutes": 30,
  "automaticPendingFollowUp": false,
  "showAmetropiaFields": false,
  "limitedDaysEnabled": false,
  "limitedDayRules": [{ "weekday": 3, "capacity": 10 }],
  "meiQuotaEnabled": false,
  "meiQuotaRules": [{ "weekday": 3, "morningQuota": 4, "afternoonQuota": 6 }],
  "ophthalmologyRoutingEnabled": true,
  "ophthalmologyMinimumAge": 55,
  "ophthalmologyHoursRules": [{ "weekday": 6, "openingTime": "08:00", "closingTime": "12:00" }],
  "transportEnabled": false,
  "transportHoursRules": [],
  "openingTime": "08:00",
  "closingTime": "18:00",
  "active": true,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

#### Reservas de horario em `appointmentSlots`

Cada bloco controlado de 10 minutos possui um documento minimo e deterministico (`slot-{storeId}-{data}-{hora}`), sem nome, telefone ou observacoes. Um atendimento de 20 minutos reserva dois documentos consecutivos; um de 10 minutos reserva um. Uma reserva existente nao pode ser sobrescrita, evitando dupla ocupacao por captadores simultaneos.

O cadastro e a reserva nao sao mais criados no mesmo lote. Primeiro o lead e persistido sem horario confirmado; depois um lote atualiza o lead e cria todos os blocos. Se a reserva falhar, o lead permanece salvo com `appointmentReservation.status = pending` e aparece em `Sync`.

```json
{
  "storeId": "loja-06",
  "appointmentDate": "2026-10-20",
  "appointmentTime": "08:00",
  "blockTime": "08:00",
  "durationMinutes": 20,
  "leadId": "uuid-do-lead",
  "capturedByUid": "firebase-uid",
  "createdAt": "Timestamp"
}
```

### 7.2 Colecao `appointmentServices`

```json
{
  "name": "Exame de vista",
  "durationMinutes": 20,
  "storeIds": ["loja-02", "loja-04", "loja-05", "loja-06"],
  "active": true,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

Somente servicos ativos e associados a unidade aparecem em novos cadastros. A exclusao remove o servico do catalogo, mas nao apaga o nome e a duracao copiados para leads anteriores.

### 7.3 Colecao `allowedEmails`

O identificador do documento sera o e-mail normalizado em letras minusculas.

```json
{
  "email": "colaborador@exemplo.com",
  "displayName": "Nome do colaborador",
  "role": "captor",
  "storeId": "store-id",
  "active": true,
  "createdAt": "Timestamp",
  "createdBy": "uid-admin"
}
```

Essa colecao resolve a autorizacao do primeiro acesso: o e-mail e liberado antes do login, e o usuario autenticado cria seu perfil somente se os dados coincidirem com a autorizacao.

### 7.4 Colecao `users`

O identificador do documento sera o UID entregue pelo Firebase Authentication.

```json
{
  "email": "colaborador@exemplo.com",
  "displayName": "Nome do colaborador",
  "photoUrl": "https://...",
  "role": "captor",
  "storeId": "store-id",
  "active": true,
  "createdAt": "Timestamp",
  "lastLoginAt": "Timestamp"
}
```

### 7.5 Colecao `interests`

```json
{
  "label": "Oculos completo",
  "order": 10,
  "active": true
}
```

### 7.6 Colecao `leads`

O identificador sera um UUID gerado no dispositivo. Isso torna a gravacao idempotente: repetir o envio do mesmo cadastro atualiza o mesmo documento e nao cria outra linha.

```json
{
  "fullName": "Maria da Silva",
  "preferredName": "Maria",
  "phone": "+5581999999999",
  "phoneSearch": "81999999999",
  "customerCpf": "52998224725",
  "customerRg": "1.234.567",
  "birthDate": "1985-04-12",
  "sex": "female",
  "street": "Rua das Flores",
  "streetNumber": "S/N",
  "neighborhood": "Centro",
  "city": "Recife",
  "state": "PE",
  "interestId": "oculos-completo",
  "interestLabel": "Oculos completo",
  "appointmentServiceId": "service-id",
  "appointmentServiceName": "Exame de vista",
  "appointmentDurationMinutes": 20,
  "appointmentSchedulingMode": "controlled",
  "appointmentDate": "2026-10-02",
  "appointmentTime": "14:30",
  "appointmentReservation": {
    "status": "confirmed",
    "reason": "",
    "requestedDate": "",
    "requestedTime": ""
  },
  "appointmentAttendance": "pending",
  "appointmentAttendanceUpdatedAt": "Timestamp opcional",
  "appointmentAttendanceUpdatedByUid": "firebase-uid-gestor opcional",
  "notes": "Prefere contato pela manha",
  "ametropiaIds": ["myopia"],
  "pathologyIds": ["cataract"],
  "eyeSurgeryStatus": "yes",
  "eyeSurgeryType": "cataract",
  "careRoute": "ophthalmologist",
  "needsTransport": true,
  "hasCompanion": false,
  "transportSeats": 1,
  "source": "street",
  "capturedAtClient": "2026-09-28T13:45:00.000Z",
  "createdAtServer": "Timestamp ou null enquanto offline",
  "updatedAtServer": "Timestamp ou null enquanto offline",
  "capturedByUid": "firebase-uid",
  "capturedByName": "Nome do colaborador",
  "storeId": "store-id",
  "installationId": "uuid-da-instalacao",
  "appVersion": "1.0.0",
  "schemaVersion": 1
}
```

`phoneSearch` facilita a busca autorizada, mas nao deve ser exibido como campo separado. Nao sera criada uma chave unica baseada no telefone, pois uma mesma pessoa pode ser abordada legitimamente em momentos diferentes.

Para leads captados offline, `appointmentDate` e `appointmentTime` permanecem vazios e `appointmentReservation` usa `status: pending`, `reason: offline` e solicitacao vazia. `reason: confirming` representa uma reserva em confirmacao; `reason: conflict` informa que os blocos solicitados foram ocupados por outra gravacao.

### 7.7 Colecao `roleProfiles`

```json
{
  "name": "Supervisor de atendimento",
  "scope": "stores",
  "baseRole": "manager",
  "permissions": ["management.view", "appointments.view"],
  "system": false,
  "active": true
}
```

Perfis do sistema usam IDs estaveis (`system-captor`, `system-mei`, `system-manager`, `system-receptionist` e `system-admin`). Perfis personalizados sao documentos do Firestore. O administrador sempre recebe todas as permissoes conhecidas independentemente do vetor salvo.

### 7.8 Colecao `goals`

Cada documento representa a meta individual de um captador. Uma atribuicao em massa compartilha o mesmo `groupId`, mas cria documentos independentes para preservar autorizacao e leitura simples.

```json
{
  "title": "Meta de captacoes",
  "metric": "leads_captured",
  "targetCount": 20,
  "startDate": "2026-10-01",
  "endDate": "2026-10-31",
  "storeId": "loja-06",
  "assigneeUid": "firebase-uid-captador",
  "assigneeName": "Nome do captador",
  "createdByUid": "firebase-uid-gestor",
  "createdByName": "Nome do gestor",
  "createdAt": "Timestamp",
  "groupId": "uuid-da-atribuicao",
  "schemaVersion": 1
}
```

O progresso nao e gravado no documento. Ele e calculado a partir dos leads sincronizados para evitar contadores divergentes e operacoes privilegiadas no plano Spark.

### 7.9 Indices

- `leads`: `capturedByUid ASC, capturedAtClient DESC`.
- `leads`: `storeId ASC, capturedAtClient DESC`.
- `leads`: `storeId ASC, capturedByUid ASC, capturedAtClient DESC`.
- `leads`: `storeId ASC, appointmentDate ASC`.

Novos indices somente deverao ser adicionados a partir de consultas reais. Cada tela de gestao deve exigir periodo para evitar consultas amplas.

## 8. Fluxo offline e sincronizacao

### 8.1 Persistencia

O Firestore sera inicializado com cache persistente em IndexedDB. Ao salvar:

1. O formulario valida e normaliza os dados.
2. O navegador gera um UUID.
3. O Firestore grava o documento no cache local.
4. A interface confirma o cadastro imediatamente.
5. O item recebe estado visual `Pendente` enquanto `hasPendingWrites` for verdadeiro.
6. Quando houver conexao, o SDK envia a escrita ao Firestore.
7. O item passa para `Sincronizado` depois da confirmacao remota.

O agendamento segue um fluxo deliberadamente diferente:

1. Sem snapshot confirmado do servidor, data e horario ficam desabilitados.
2. O lead offline e gravado com `appointmentReservation.status = pending` e sem data ou horario solicitado.
3. Ao voltar online, o captador abre o lead e consulta a disponibilidade atual.
4. Online, o sistema persiste primeiro o lead pendente com UUID definitivo.
5. Somente depois da confirmacao remota tenta reservar, em lote, todos os blocos de 10 minutos e confirmar o horario no lead.
6. Se algum bloco estiver ocupado, o lote falha, mas o documento do lead permanece e muda para `reason = conflict`.
7. Se a conexao oscilar durante a confirmacao, o lead permanece em `Sync` para conclusao posterior.

### 8.2 Estados exibidos

| Estado | Significado | Acao disponivel |
| --- | --- | --- |
| Pendente | Salvo no aparelho e ainda nao confirmado na nuvem | Aguardar ou sincronizar |
| Sincronizando | Envio em andamento | Aguardar |
| Sincronizado | Confirmado pelo Firestore | Nenhuma |
| Erro | Rejeitado por permissao, validacao ou falha nao transitoria | Ver detalhe e tentar novamente |
| Aguardando agendamento | Lead preservado sem data e horario | Conectar, contatar o cliente e escolher um horario |
| Horario ocupado | Lead preservado, mas a reserva perdeu uma disputa | Escolher outra data ou horario |

O estado de sincronizacao e metadado local; nao sera salvo como verdade global dentro do proprio documento.

### 8.3 Acao `Sincronizar agora`

A acao devera:

1. verificar se o navegador declara conexao;
2. habilitar a rede do Firestore;
3. aguardar as escritas pendentes com limite de tempo;
4. atualizar a contagem e o horario da ultima confirmacao;
5. manter os registros localmente se o envio nao for concluido.

### 8.4 Conflitos

Edicoes comuns do mesmo documento usam a ultima alteracao aceita. Reservas de agenda nao usam `ultima escrita vence`: documentos deterministico de `appointmentSlots` impedem sobrescrever blocos ocupados. A falha da reserva nunca deve excluir o lead, que permanece na lista e em `Sync`.

Transporte, escala da loja, agenda oftalmologica, limite diario e cotas do MEI sao validados novamente no momento da escolha do horario. A interface filtra opcoes, enquanto regras e lotes do Firestore protegem a disputa entre dispositivos.

### 8.5 Duplicidade

- Antes de salvar, o aplicativo alertara se encontrar o mesmo telefone nos registros locais recentes.
- O aviso nao bloqueara a captacao.
- O gestor podera identificar repeticoes na consulta centralizada.
- Nao sera feita uma leitura global a cada digitacao, preservando privacidade, operacao offline e cota gratuita.

## 9. PWA e cache

### 9.1 App shell

O Service Worker armazenara os arquivos necessarios para abrir a interface:

- HTML principal;
- CSS e JavaScript versionados;
- icones e fontes locais;
- pagina de contingencia offline.

Dados dos clientes permanecerao sob responsabilidade do cache persistente do Firestore, sem duplicacao no Cache Storage.

### 9.2 Estrategias de cache

| Recurso | Estrategia |
| --- | --- |
| Arquivos versionados do build | Cache first |
| HTML de entrada | Network first com fallback em cache |
| Icones e fontes locais | Stale while revalidate |
| Firestore e Authentication | SDK oficial; nao interceptar no Service Worker |

Ao detectar nova versao, o aplicativo avisara o usuario e aplicara a atualizacao apenas quando for seguro recarregar a tela, evitando perda de formulario em edicao.

## 10. Autenticacao e autorizacao

### 10.1 Primeiro acesso

1. O administrador cadastra o e-mail em `allowedEmails`.
2. O colaborador acessa online com Google ou e-mail e senha.
3. O sistema exige e-mail verificado e consulta a autorizacao.
4. O perfil em `users/{uid}` e criado com os mesmos `role` e `storeId` autorizados.
5. A sessao passa a ser persistida no navegador.

O login Google usara popup em computadores e celulares. No GitHub Pages, o redirecionamento entre dominios pode perder o estado da autenticacao por restricoes modernas de armazenamento do navegador. Em navegadores internos de outros aplicativos, a interface orientara abrir o FascinLead diretamente no Chrome ou Safari quando o popup for bloqueado.

No fluxo por senha, a administracao cria a conta com senha inicial padrao, exceto para o administrador, e o Firebase envia verificacao de e-mail. A troca administrativa de senha usa uma Callable Function protegida por autenticacao e verificacao do perfil administrador. Recuperacao individual usa o e-mail do Firebase Authentication.

### 10.2 Principios das regras do Firestore

- Negar qualquer operacao nao autorizada explicitamente.
- Exigir usuario autenticado, verificado, ativo e previamente autorizado.
- Captador cria registros apenas com seu proprio UID e sua loja.
- Captador le e altera apenas registros proprios.
- Gestor le registros apenas das unidades permitidas em `storeIds`.
- Administrador acessa todas as lojas e configuracoes.
- Permissoes granulares complementam `role` e `roleProfileId`; nenhuma permissao de interface amplia o que as regras autorizam.
- Blocos de agenda somente podem ser criados para um lead e uma unidade permitidos e nao podem substituir uma reserva existente.
- Nenhum cliente pode elevar seu proprio perfil, trocar `storeId` ou alterar `role`.
- Validar chaves permitidas, tipos, limites de texto e valores enumerados.
- Permitir exclusao definitiva de `leads` somente para administradores.
- Captadores leem apenas suas metas; gestores leem e administram metas da propria loja; administradores administram todas.

Testes automatizados de regras serao obrigatorios antes do deploy.

## 11. Seguranca e privacidade

### 11.1 Controles tecnicos

- HTTPS obrigatorio pelo Firebase Hosting.
- Content Security Policy restrita aos dominios necessarios.
- Configuracao do Firebase separada por ambiente.
- Nenhum segredo administrativo, chave privada ou conta de servico no frontend.
- Tokens da API e credenciais administrativas existem apenas no processo servidor, nunca no bundle ou em URLs.
- A API externa e negada por padrao, exige Bearer token e nao libera campos sensiveis sem configuracao dupla.
- Nenhum dado pessoal em `console.log`, telemetria ou mensagens tecnicas.
- Dependencias atualizadas e auditadas com `npm audit`.
- Firebase App Check sera avaliado apos o MVP, sem ser requisito de lancamento.

A chave web publica do Firebase identifica o projeto, mas nao concede acesso administrativo. As regras do Firestore e a autorizacao dos usuarios formam a barreira efetiva contra acesso indevido.

### 11.2 LGPD e operacao

- Coletar apenas dados necessarios a captacao, pre-agendamento, transporte e triagem aprovada.
- CPF, RG, patologias, ametropias e historico cirurgico sao dados pessoais ou sensiveis e exigem acesso restrito, finalidade definida e revisao periodica da necessidade.
- Definir responsavel interno por solicitacoes de acesso, correcao e exclusao.
- Definir prazo de retencao antes da producao; proposta inicial: revisar ou excluir cadastros sem evolucao apos 180 dias.
- Orientar usuarios a protegerem o aparelho com senha ou biometria.
- Disponibilizar comando de sair e procedimento para revogar aparelhos perdidos.

O FascinLead nao registra um campo especifico de consentimento. A empresa deve validar a base legal aplicavel ao tratamento dos contatos e definir o prazo de retencao antes do uso real.

## 12. Uso e custo do Firebase

O aplicativo principal continua desenhado para baixo consumo de Authentication, Firestore e Hosting. Segundo a documentacao oficial consultada em setembro de 2026, esses produtos possuem cotas gratuitas sujeitas a alteracoes do Firebase. Os numeros devem ser revistos antes de cada implantacao, em vez de serem tratados como contrato permanente neste documento.

A Callable Function de redefinicao administrativa de senha e uma excecao ao frontend estatico. Antes de publica-la, a equipe deve confirmar os requisitos atuais de faturamento, definir alertas de custo e limitar seu uso a administradores autenticados. Sem essa funcao publicada, captacao, sincronizacao, agenda e gestao de dados continuam operacionais; apenas a troca administrativa direta de senha fica indisponivel.

Medidas para controlar consumo:

- nao manter listeners em tempo real sobre toda a base;
- limitar listas e usar paginacao;
- exigir periodo nas consultas gerenciais;
- carregar apenas campos e documentos necessarios;
- evitar consultas repetidas a cada tecla;
- executar desenvolvimento com Emulator Suite;
- acompanhar consumo no Firebase Console;
- nao habilitar produtos que exijam faturamento sem aprovacao formal.

No Spark, atingir uma cota pode interromper aquele recurso ate o fim do periodo aplicavel. O limite deve ser monitorado desde o piloto.

## 13. Tratamento de erros

| Situacao | Comportamento esperado |
| --- | --- |
| Sem internet ao abrir pela primeira vez | Explicar que o primeiro acesso requer conexao |
| Conta nao autorizada | Bloquear dados e orientar contato com o administrador |
| Falha ao salvar localmente | Nao limpar o formulario e exibir acao para tentar novamente |
| Permissao revogada | Bloquear novas operacoes e encerrar dados protegidos da sessao |
| Quota Firebase excedida | Preservar pendencias locais e informar indisponibilidade temporaria |
| Nova versao disponivel | Oferecer atualizacao sem descartar formulario ou escrita pendente |
| Cache do navegador indisponivel | Alertar que o modo offline nao esta garantido naquele dispositivo |

Mensagens ao usuario devem ser simples e acionaveis. Detalhes tecnicos podem usar codigos internos sem incluir dados pessoais.

## 14. Testes

### 14.1 Unitarios

- normalizacao e validacao de telefone;
- validacao e serializacao do formulario;
- filtros de busca;
- estados de sincronizacao;
- geracao e escapamento do CSV;
- verificacao de permissoes na interface.
- calculo de blocos consecutivos, escalas semanais e duracao por servico;
- limites diarios e cotas do MEI por manha e tarde;
- triagem oftalmologica, transporte e retornos;
- serializacao de leads pendentes sem data e horario.

### 14.2 Regras e integracao

- usuario nao autorizado nao cria perfil;
- captador nao acessa registro de outro captador;
- gestor nao acessa outra loja;
- usuario nao altera seu perfil ou papel;
- lead invalido e rejeitado;
- UUID repetido nao cria duplicata;
- escrita offline reaparece apos reiniciar a pagina e sincroniza ao voltar online.
- lead offline sem agenda e aceito com `appointmentReservation` pendente;
- reserva concorrente nao sobrescreve blocos ocupados e nao remove o lead;
- administrador conserva todas as permissoes e demais perfis respeitam o escopo configurado;
- API rejeita token ausente ou invalido;
- API pagina os leads e valida filtros, lojas e cursores;
- CPF e informacoes de saude nao aparecem na resposta padrao.

### 14.3 Ponta a ponta

- primeiro login online;
- instalacao do PWA;
- cadastro online;
- cadastro e consulta offline;
- data e horario bloqueados quando a agenda nao foi confirmada pelo servidor;
- lead offline listado em Cadastros e Sync e agendado depois da reconexao;
- disputa de horario entre dispositivos preserva o lead perdedor;
- retorno da conexao e confirmacao da sincronizacao;
- correcao de cadastro pendente;
- busca por nome e telefone;
- exportacao do gestor;
- sessao expirada ou acesso revogado;
- layout em 360 x 800, 390 x 844, tablet e desktop.

### 14.4 Criterios para piloto

- zero perda em 100 ciclos automatizados de cadastro offline e reconexao;
- regras do Firestore com todos os testes aprovados;
- Lighthouse PWA sem erros impeditivos;
- fluxo principal aprovado em ao menos um Android e um iPhone reais;
- nenhum dado pessoal exposto em logs, URLs ou mensagens de erro.

## 15. Implantacao

### 15.1 Ambientes

- Desenvolvimento: Firebase Emulator Suite.
- Producao: um projeto Firebase exclusivo para o FascinLead.

Um projeto de homologacao separado e desejavel quando o volume ou a equipe aumentar. Para o MVP, o emulador evita custo e mistura de dados.

### 15.2 Configuracao inicial

1. Criar projeto Firebase da empresa.
2. Escolher a localizacao do Firestore mais adequada antes de criar o banco; essa decisao nao deve ser tratada como facilmente reversivel.
3. Habilitar os provedores Google e E-mail/Senha no Authentication.
4. Configurar dominios autorizados.
5. Criar Firestore e publicar regras e indices.
6. Configurar Firebase Hosting e cabecalhos de seguranca.
7. Cadastrar lojas e os primeiros administradores.
8. Quando a redefinicao administrativa de senha for usada, publicar a Callable Function e validar plano, regiao e custo.
9. Executar testes e publicar o build estatico.

### 15.3 Deploy

O primeiro deploy podera ser manual pelo Firebase CLI. Automatizacao por GitHub Actions deve ser acrescentada depois, usando credenciais protegidas e revisao antes da publicacao em producao.

## 16. Observabilidade e suporte

- Exibir versao do aplicativo e hora da ultima sincronizacao na tela de suporte.
- Exibir quantidade de itens pendentes e com erro.
- Registrar apenas eventos tecnicos anonimizados no navegador durante o MVP.
- Monitorar Authentication, Firestore e Hosting pelo Firebase Console.
- Criar procedimento de suporte para exportar codigo de erro, sem exportar dados do cliente.
- Manter rotina de backup/exportacao definida antes de ampliar o piloto.

## 17. Plano de entrega

### Fase 1 - Fundacao

- estrutura Vite e identidade visual;
- PWA instalavel e app shell offline;
- Firebase Emulator Suite;
- login Google ou E-mail/Senha e autorizacao por e-mail;
- regras iniciais do Firestore.

### Fase 2 - Captacao offline

- formulario curto;
- persistencia offline;
- lista `Meus cadastros`;
- estados e acao de sincronizacao;
- testes unitarios, de regras e offline.

### Fase 3 - Gestao

- filtros por loja, colaborador e periodo;
- indicadores simples de quantidade;
- exportacao CSV;
- administracao minima de acessos.
- metas individuais de quantidade de leads com visibilidade por equipe.

### Fase 4 - Piloto

- uso com um grupo pequeno de colaboradores;
- teste em areas com conectividade ruim;
- ajuste de campos e linguagem;
- avaliacao das cotas do Firebase;
- decisao de liberar para todas as lojas.

## 18. Criterios de aceitacao do MVP

O MVP estara apto para piloto quando:

1. Um usuario autorizado conseguir entrar com Google.
2. Um captador conseguir cadastrar um cliente sem internet.
3. O registro permanecer no aparelho depois de fechar e reabrir o PWA.
4. O registro sincronizar sem duplicacao quando a internet voltar.
5. O captador conseguir pesquisar e corrigir os proprios registros.
6. O gestor conseguir consultar apenas sua loja e exportar CSV.
7. Um usuario de outra loja nao conseguir acessar os dados pelas APIs do Firestore.
8. O aplicativo informar claramente conectividade, pendencias e erros.
9. O fluxo funcionar em celular Android e iPhone reais.
10. Nenhum servico que exija o plano Blaze estiver habilitado.

## 19. Decisoes arquiteturais

| ID | Decisao | Justificativa |
| --- | --- | --- |
| ADR-001 | Usar PWA, nao aplicativo nativo | Distribuicao simples e um unico codigo para celulares e desktop |
| ADR-002 | Usar JavaScript sem framework de UI | Escopo pequeno, menor peso e menor curva de manutencao |
| ADR-003 | Usar Firestore como armazenamento local e remoto | SDK oferece cache persistente e sincronizacao offline |
| ADR-004 | Manter o aplicativo principal sem backend obrigatorio | Captacao, operacao offline e telas continuam independentes da API de integracao |
| ADR-005 | Autorizar e-mails antes do primeiro acesso | Login Google sozinho nao restringe contas a colaboradores |
| ADR-006 | Coletar CPF e RG apenas como campos opcionais | Atende a operacao sem bloquear a captacao e exige tratamento reforcado de privacidade |
| ADR-007 | Nao depender de sincronizacao em segundo plano | Navegadores, especialmente no iOS, nao garantem execucao com o app fechado |
| ADR-008 | Gerar UUID no dispositivo | Permite salvar offline e repetir o envio sem duplicar o documento |
| ADR-009 | Usar `#003070` como cor principal | E a cor oficial informada para a marca Oticas Fascinante |
| ADR-010 | Disponibilizar as lojas 02, 04, 05 e 06 | Sao as unidades definidas para a operacao inicial do FascinLead |
| ADR-011 | Registrar pre-agendamento opcional e exportar CSV detalhado | Permite encaminhar a captacao com contexto util sem transformar o produto em agenda ou CRM |
| ADR-012 | Nao solicitar nem exportar um campo de consentimento | O fornecimento dos dados durante a captacao sera tratado operacionalmente sem uma confirmacao separada no formulario |
| ADR-013 | Permitir edicao e exclusao global de leads somente para administradores | Viabiliza correcao operacional e remocao de registros sem ampliar o poder dos gestores ou captadores |
| ADR-014 | Modelar atribuicoes em massa como uma meta individual por captador | Simplifica as regras por usuario, preserva a visibilidade por loja e prepara o progresso para futura gamificacao |
| ADR-015 | Exibir os pre-agendamentos em agenda mensal derivada dos leads | Oferece visao operacional ao gestor sem duplicar dados nem transformar o sistema em um CRM ou agenda de confirmacoes |
| ADR-016 | Configurar intervalos de atendimento no documento da loja | Mantem regras diferentes por unidade e permite calcular os horarios livres sem duplicar a agenda |
| ADR-017 | Expor uma API versionada e somente leitura para CRMs | Separa captacao de operacao comercial, permite sincronizacao incremental e preserva um contrato estavel |
| ADR-018 | Usar blocos atomicos de 10 minutos para a agenda | Permite combinar servicos com duracoes diferentes e impedir sobreposicoes parciais |
| ADR-019 | Nao permitir reservar agenda offline | Disponibilidade, transporte, cotas e escalas dependem do estado atual do servidor |
| ADR-020 | Persistir o lead antes de reservar os blocos | Uma disputa de horario pode falhar sem apagar os dados captados |
| ADR-021 | Exigir snapshot do servidor para liberar data e horario | `navigator.onLine` pode indicar rede local sem acesso real ao Firebase |
| ADR-022 | Modelar autorizacao com perfis e permissoes granulares | Permite cargos personalizados sem multiplicar papeis fixos nas regras e na interface |
| ADR-023 | Manter Administrador com todas as permissoes | Evita bloquear acidentalmente a administracao e a recuperacao operacional |
| ADR-024 | Separar escala da loja, oftalmologista e transporte | Cada recurso possui disponibilidade semanal independente e precisa |

## 20. Pendencias de produto e operacao

- Qual sera o prazo definitivo de retencao e exclusao?
- Qual e a capacidade de passageiros de cada veiculo?
- Qual e o numero minimo de leads para fechar uma viagem e qual acao ocorre quando esse minimo nao e atingido?
- Havera mais patologias ou cirurgias que encaminham obrigatoriamente ao oftalmologista?
- A senha inicial padrao devera ser substituida futuramente por convite ou senha temporaria de uso unico?
- Qual sera a estrategia definitiva de hospedagem e custo da API local e da Callable Function?
- Quais alertas, auditoria e backups serao exigidos antes do piloto ampliado?

Essas decisoes nao impedem a evolucao tecnica, mas devem ser respondidas antes do uso ampliado com dados reais.

## 21. Referencias tecnicas

- [Firebase Authentication com Google](https://firebase.google.com/docs/auth/web/google-signin)
- [Acesso offline do Cloud Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Precos e cotas do Cloud Firestore](https://firebase.google.com/docs/firestore/pricing)
- [Planos de faturamento do Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Precos dos produtos Firebase](https://firebase.google.com/pricing)

As cotas e condicoes comerciais devem ser verificadas novamente no inicio da implantacao, pois podem mudar.
