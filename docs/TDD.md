# FascinLead - Technical Design Document

| Campo | Valor |
| --- | --- |
| Documento | Technical Design Document (TDD) |
| Projeto | FascinLead |
| Versao | 1.0 |
| Status | Em implementacao |
| Data | 28/09/2026 |
| Responsavel | Oticas Fascinante |

## 1. Visao geral

O FascinLead sera uma aplicacao web progressiva (PWA) para substituir fichas de papel usadas por colaboradores durante a captacao de potenciais clientes na rua.

O sistema devera permitir o pre-cadastro rapido mesmo sem internet. Quando a conexao for restabelecida, os registros pendentes serao sincronizados com a nuvem. O produto nao sera um CRM completo: seu foco e registrar, consultar e encaminhar contatos captados para a equipe responsavel.

### 1.1 Objetivos

- Reduzir o tempo gasto no cadastro durante uma abordagem.
- Eliminar perda, rasura e digitacao posterior de fichas em papel.
- Permitir uso confiavel sem internet.
- Identificar colaborador, loja, data e origem de cada captacao.
- Centralizar os registros na nuvem quando houver conexao.
- Entregar uma interface simples para celular e instalavel como aplicativo.
- Permanecer, inicialmente, dentro dos recursos gratuitos do Firebase.

### 1.2 Fora do escopo

- CRM completo, funil comercial ou automacao de vendas.
- Atendimento ou campanhas pelo WhatsApp.
- Agenda centralizada, confirmacoes ou lembretes de consultas e exames. O MVP registra somente um pre-agendamento opcional no lead.
- Anamnese, recomendacao de lentes ou provador virtual.
- Metas, comissoes, faturamento ou conciliacao de vendas.
- Integracao com Savwin, AppOk ou outros sistemas externos.
- Envio de notificacoes push na primeira versao.
- Funcionamento como aplicativo nativo publicado nas lojas Android e iOS.

## 2. Usuarios e permissoes

| Perfil | Responsabilidade | Permissoes iniciais |
| --- | --- | --- |
| Captador | Realizar abordagens na rua | Criar, consultar e corrigir os proprios pre-cadastros |
| Gestor | Acompanhar a captacao de uma loja | Consultar e exportar os registros da propria loja |
| Administrador | Administrar o FascinLead | Gerenciar usuarios, lojas e consultar todos os registros |

As permissoes devem ser aplicadas pelas regras do Firestore. Ocultar botoes na interface nao substitui a autorizacao no banco.

## 3. Requisitos funcionais

### RF-01 - Autenticacao

- O acesso sera feito por uma conta Google.
- O primeiro login de um dispositivo exige internet.
- Apenas e-mails previamente autorizados poderao utilizar o sistema.
- A sessao devera permanecer salva no dispositivo para usos posteriores.
- Usuarios inativos deverao perder acesso na proxima verificacao online.

### RF-02 - Novo pre-cadastro

Campos minimos propostos:

| Campo | Obrigatorio | Regra |
| --- | --- | --- |
| Nome | Sim | Entre 2 e 120 caracteres |
| Telefone/WhatsApp | Sim | Normalizado para telefone brasileiro |
| Apelido | Nao | Ate 60 caracteres |
| Bairro | Nao | Ate 80 caracteres |
| Cidade | Nao | Ate 80 caracteres |
| UF | Nao | Duas letras; padrao configuravel por loja |
| Interesse principal | Nao | Opcao de uma lista administrada pelo sistema |
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

CPF, dados de saude, receita, fotos e geolocalizacao exata nao farao parte do MVP. Isso reduz digitacao, exposicao de dados pessoais e complexidade de conformidade.

### RF-03 - Operacao offline

- O formulario devera abrir e salvar sem conexao depois que o aplicativo tiver sido carregado ao menos uma vez.
- Um registro salvo offline devera aparecer imediatamente em `Meus cadastros`.
- O usuario devera enxergar claramente se cada item esta pendente, sincronizando, sincronizado ou com erro.
- Fechar e reabrir o aplicativo nao podera apagar registros pendentes.

### RF-04 - Sincronizacao

A sincronizacao sera tentada:

- automaticamente ao salvar quando houver internet;
- ao abrir o aplicativo;
- quando o navegador disparar o evento `online`;
- quando o aplicativo voltar ao primeiro plano;
- pelo comando manual `Sincronizar agora`.

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

O CSV detalhado inclui identificadores do lead e do captador, dados do cliente, loja, data e hora da captacao, pre-agendamento opcional, interesse, endereco, origem e observacoes. Nao inclui consentimento, status de funil, etapa de Kanban, comparecimento, venda ou valor, pois esses dados nao sao controlados pelo FascinLead.

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

## 5. Arquitetura proposta

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
| Login | Firebase Authentication com Google | Login conhecido e persistencia de sessao |
| Dados | Cloud Firestore | Persistencia offline no navegador e sincronizacao automatica |
| Hospedagem | Firebase Hosting | HTTPS, CDN e deploy estatico |
| Testes unitarios | Vitest | Integracao simples com o Vite |
| Testes de interface | Playwright | Validacao dos fluxos online, offline e responsivos |
| Testes locais Firebase | Firebase Emulator Suite | Testes sem consumir cota e validacao das regras |

Nao serao utilizados Cloud Functions, Cloud Run, Storage ou extensoes pagas no MVP.

### 5.2 Estrutura inicial de diretorios

```text
FASCINLEAD/
|-- docs/
|   `-- TDD.md
|-- public/
|   |-- icons/
|   |-- manifest.webmanifest
|   `-- offline.html
|-- src/
|   |-- app/
|   |   |-- router.js
|   |   `-- state.js
|   |-- components/
|   |-- firebase/
|   |   |-- auth.js
|   |   |-- config.js
|   |   |-- firestore.js
|   |   `-- sync.js
|   |-- pages/
|   |   |-- login.js
|   |   |-- home.js
|   |   |-- new-lead.js
|   |   |-- leads.js
|   |   |-- sync.js
|   |   `-- management.js
|   |-- services/
|   |   |-- lead-service.js
|   |   `-- export-service.js
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

1. `Login`: entrar com Google e informar quando a conta nao estiver autorizada.
2. `Inicio`: atalhos, usuario/loja, conectividade e quantidade pendente.
3. `Novo`: formulario curto de pre-cadastro.
4. `Cadastros`: lista pesquisavel dos registros do colaborador.
5. `Sincronizacao`: totais, ultimo envio, erros e acao manual.
6. `Gestao`: filtros, totais e exportacao para perfis autorizados.
7. `Acessos`: autorizacao, alteracao de perfil/loja e bloqueio de usuarios por administradores.

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
  "active": true,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### 7.2 Colecao `allowedEmails`

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

### 7.3 Colecao `users`

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

### 7.4 Colecao `interests`

```json
{
  "label": "Oculos completo",
  "order": 10,
  "active": true
}
```

### 7.5 Colecao `leads`

O identificador sera um UUID gerado no dispositivo. Isso torna a gravacao idempotente: repetir o envio do mesmo cadastro atualiza o mesmo documento e nao cria outra linha.

```json
{
  "fullName": "Maria da Silva",
  "preferredName": "Maria",
  "phone": "+5581999999999",
  "phoneSearch": "81999999999",
  "neighborhood": "Centro",
  "city": "Recife",
  "state": "PE",
  "interestId": "oculos-completo",
  "interestLabel": "Oculos completo",
  "appointmentDate": "2026-10-02",
  "appointmentTime": "14:30",
  "notes": "Prefere contato pela manha",
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

### 7.6 Indices previstos

- `leads`: `capturedByUid ASC, capturedAtClient DESC`.
- `leads`: `storeId ASC, capturedAtClient DESC`.
- `leads`: `storeId ASC, capturedByUid ASC, capturedAtClient DESC`.

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

### 8.2 Estados exibidos

| Estado | Significado | Acao disponivel |
| --- | --- | --- |
| Pendente | Salvo no aparelho e ainda nao confirmado na nuvem | Aguardar ou sincronizar |
| Sincronizando | Envio em andamento | Aguardar |
| Sincronizado | Confirmado pelo Firestore | Nenhuma |
| Erro | Rejeitado por permissao, validacao ou falha nao transitoria | Ver detalhe e tentar novamente |

O estado de sincronizacao e metadado local; nao sera salvo como verdade global dentro do proprio documento.

### 8.3 Acao `Sincronizar agora`

A acao devera:

1. verificar se o navegador declara conexao;
2. habilitar a rede do Firestore;
3. aguardar as escritas pendentes com limite de tempo;
4. atualizar a contagem e o horario da ultima confirmacao;
5. manter os registros localmente se o envio nao for concluido.

### 8.4 Conflitos

O MVP adota `ultima alteracao confirmada vence` para edicoes do mesmo documento. Como cada captador manipula principalmente os proprios registros, a possibilidade de conflito e pequena. Uma futura necessidade de edicao simultanea exigira versao do documento ou transacoes.

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
2. O colaborador acessa online e escolhe `Entrar com Google`.
3. O sistema exige e-mail verificado e consulta a autorizacao.
4. O perfil em `users/{uid}` e criado com os mesmos `role` e `storeId` autorizados.
5. A sessao passa a ser persistida no navegador.

O login Google usara popup em computadores e celulares. No GitHub Pages, o redirecionamento entre dominios pode perder o estado da autenticacao por restricoes modernas de armazenamento do navegador. Em navegadores internos de outros aplicativos, a interface orientara abrir o FascinLead diretamente no Chrome ou Safari quando o popup for bloqueado.

### 10.2 Principios das regras do Firestore

- Negar qualquer operacao nao autorizada explicitamente.
- Exigir usuario autenticado, verificado, ativo e previamente autorizado.
- Captador cria registros apenas com seu proprio UID e sua loja.
- Captador le e altera apenas registros proprios.
- Gestor le registros apenas da loja vinculada.
- Administrador acessa todas as lojas e configuracoes.
- Nenhum cliente pode elevar seu proprio perfil, trocar `storeId` ou alterar `role`.
- Validar chaves permitidas, tipos, limites de texto e valores enumerados.
- Nao permitir exclusao definitiva de `leads` pelo aplicativo no MVP.

Testes automatizados de regras serao obrigatorios antes do deploy.

## 11. Seguranca e privacidade

### 11.1 Controles tecnicos

- HTTPS obrigatorio pelo Firebase Hosting.
- Content Security Policy restrita aos dominios necessarios.
- Configuracao do Firebase separada por ambiente.
- Nenhum segredo administrativo, chave privada ou conta de servico no frontend.
- Nenhum dado pessoal em `console.log`, telemetria ou mensagens tecnicas.
- Dependencias atualizadas e auditadas com `npm audit`.
- Firebase App Check sera avaliado apos o MVP, sem ser requisito de lancamento.

A chave web publica do Firebase identifica o projeto, mas nao concede acesso administrativo. As regras do Firestore e a autorizacao dos usuarios formam a barreira efetiva contra acesso indevido.

### 11.2 LGPD e operacao

- Coletar apenas dados necessarios ao contato comercial.
- Definir responsavel interno por solicitacoes de acesso, correcao e exclusao.
- Definir prazo de retencao antes da producao; proposta inicial: revisar ou excluir cadastros sem evolucao apos 180 dias.
- Orientar usuarios a protegerem o aparelho com senha ou biometria.
- Disponibilizar comando de sair e procedimento para revogar aparelhos perdidos.

O FascinLead nao registra um campo especifico de consentimento. A empresa deve validar a base legal aplicavel ao tratamento dos contatos e definir o prazo de retencao antes do uso real.

## 12. Uso do plano gratuito Firebase

O MVP sera desenhado para o plano Spark. Segundo a documentacao oficial consultada em setembro de 2026, login social esta disponivel sem custo, e Firestore e Hosting possuem cotas gratuitas. No Firestore, a cota publicada inclui 1 GiB armazenado, 50 mil leituras por dia, 20 mil escritas por dia, 20 mil exclusoes por dia e 10 GiB de saida por mes, sujeita a alteracoes do Firebase.

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
| Conta Google nao autorizada | Bloquear dados e orientar contato com o administrador |
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

### 14.2 Regras e integracao

- usuario nao autorizado nao cria perfil;
- captador nao acessa registro de outro captador;
- gestor nao acessa outra loja;
- usuario nao altera seu perfil ou papel;
- lead invalido e rejeitado;
- UUID repetido nao cria duplicata;
- escrita offline reaparece apos reiniciar a pagina e sincroniza ao voltar online.

### 14.3 Ponta a ponta

- primeiro login online;
- instalacao do PWA;
- cadastro online;
- cadastro e consulta offline;
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
3. Habilitar o provedor Google no Authentication.
4. Configurar dominios autorizados.
5. Criar Firestore e publicar regras e indices.
6. Configurar Firebase Hosting e cabecalhos de seguranca.
7. Cadastrar lojas e os primeiros administradores.
8. Executar testes e publicar o build estatico.

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
- login Google e autorizacao por e-mail;
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
| ADR-004 | Nao criar backend proprio no MVP | Nao ha integracoes nem processamento privilegiado que o justifique |
| ADR-005 | Autorizar e-mails antes do primeiro acesso | Login Google sozinho nao restringe contas a colaboradores |
| ADR-006 | Nao coletar CPF no MVP | Nao e necessario para pre-cadastro e aumenta o risco de privacidade |
| ADR-007 | Nao depender de sincronizacao em segundo plano | Navegadores, especialmente no iOS, nao garantem execucao com o app fechado |
| ADR-008 | Gerar UUID no dispositivo | Permite salvar offline e repetir o envio sem duplicar o documento |
| ADR-009 | Usar `#003070` como cor principal | E a cor oficial informada para a marca Oticas Fascinante |
| ADR-010 | Disponibilizar as lojas 02, 04, 05 e 06 | Sao as unidades definidas para a operacao inicial do FascinLead |
| ADR-011 | Registrar pre-agendamento opcional e exportar CSV detalhado | Permite encaminhar a captacao com contexto util sem transformar o produto em agenda ou CRM |
| ADR-012 | Nao solicitar nem exportar um campo de consentimento | O fornecimento dos dados durante a captacao sera tratado operacionalmente sem uma confirmacao separada no formulario |
| ADR-013 | Permitir edicao e exclusao global de leads somente para administradores | Viabiliza correcao operacional e remocao de registros sem ampliar o poder dos gestores ou captadores |

## 20. Questoes para fechar antes do desenvolvimento

- Quais e-mails terao perfil de administrador, gestor e captador?
- Nome e telefone sao suficientes como campos obrigatorios?
- Quais opcoes devem existir em `Interesse principal`?
- O gestor podera corrigir registros ou apenas consultar e exportar?
- Qual sera o prazo definitivo de retencao e exclusao?
- A visao gerencial faz parte do primeiro piloto ou da fase seguinte?
- Qual logotipo e conjunto final de icones serao usados? A cor principal ja definida e `#003070`.

Essas decisoes nao impedem a criacao da fundacao tecnica, mas devem ser respondidas antes do uso com dados reais.

## 21. Referencias tecnicas

- [Firebase Authentication com Google](https://firebase.google.com/docs/auth/web/google-signin)
- [Acesso offline do Cloud Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Precos e cotas do Cloud Firestore](https://firebase.google.com/docs/firestore/pricing)
- [Planos de faturamento do Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Precos dos produtos Firebase](https://firebase.google.com/pricing)

As cotas e condicoes comerciais devem ser verificadas novamente no inicio da implantacao, pois podem mudar.
