# FascinLead

Pre-cadastro offline para as equipes de captacao das **Oticas Fascinante**.

> **Status:** fundacao tecnica e primeiro fluxo de captacao em desenvolvimento.

O FascinLead sera uma Progressive Web App (PWA) para substituir as fichas de papel usadas por colaboradores durante abordagens na rua. O usuario podera registrar um potencial cliente mesmo sem internet, consultar os cadastros no proprio aparelho e sincroniza-los com a nuvem quando a conexao voltar.

O projeto tem um foco deliberadamente pequeno: facilitar a captacao. Ele nao pretende ser um CRM completo.

## Objetivos

- tornar o pre-cadastro rapido e simples no celular;
- funcionar em locais com conexao instavel ou inexistente;
- evitar perda, rasura e redigitacao de fichas em papel;
- identificar o colaborador, a loja e a data de cada captacao;
- centralizar os registros na nuvem depois da sincronizacao;
- operar inicialmente apenas com recursos gratuitos do Firebase.

## Fluxo principal

1. O colaborador entra com uma conta Google autorizada.
2. Inicia uma nova abordagem pelo celular.
3. Informa nome, telefone e os dados opcionais relevantes.
4. O cadastro e salvo localmente, mesmo sem internet.
5. O sistema mostra o registro como pendente.
6. Quando a conexao retorna, o registro e sincronizado com o Firestore.
7. O gestor consulta ou exporta os registros autorizados da sua loja.

## Funcionalidades do MVP

- login com Google;
- autorizacao por e-mail, perfil e loja;
- formulario curto de pre-cadastro;
- funcionamento offline depois do primeiro acesso;
- armazenamento persistente de registros pendentes;
- sincronizacao automatica e manual;
- estados `Pendente`, `Sincronizando`, `Sincronizado` e `Erro`;
- listagem e pesquisa dos cadastros do colaborador;
- alerta local de possivel telefone duplicado;
- consulta gerencial por loja, colaborador e periodo;
- exportacao para CSV;
- instalacao como PWA em celular e desktop.

## Fora do escopo

O FascinLead nao tera, no MVP:

- funil de vendas ou CRM completo;
- atendimento e campanhas pelo WhatsApp;
- agenda de consultas ou exames;
- anamnese ou recomendacao de lentes;
- provador virtual;
- metas, comissoes ou conciliacao de vendas;
- integracao com Savwin;
- integracao com AppOk;
- aplicativo nativo para Android ou iOS.

## Telas previstas

| Tela | Finalidade |
| --- | --- |
| Login | Autenticar a conta Google e validar o acesso |
| Inicio | Exibir atalhos, loja, conectividade e pendencias |
| Novo | Registrar rapidamente um potencial cliente |
| Cadastros | Consultar e pesquisar os registros do colaborador |
| Sincronizacao | Exibir contagens, erros e acao de envio manual |
| Gestao | Filtrar, acompanhar e exportar registros autorizados |

## Arquitetura

```text
Celular / navegador
  |
  |-- HTML + CSS + JavaScript
  |-- PWA + Service Worker
  |-- Firestore SDK + IndexedDB
  |
  `---- HTTPS, quando online ----> Firebase
                                      |-- Authentication
                                      |-- Cloud Firestore
                                      |-- Security Rules
                                      `-- Hosting
```

### Tecnologias planejadas

- HTML5, CSS3 e JavaScript com ES Modules;
- Vite;
- Web App Manifest e Service Worker;
- Firebase Authentication com Google;
- Cloud Firestore com persistencia offline;
- Firebase Hosting;
- Firebase Emulator Suite;
- Vitest;
- Playwright;
- Lucide Icons.

Nao serao usados Cloud Functions, Cloud Run, Storage ou outros recursos que exijam o plano Blaze durante o MVP.

## Offline primeiro

O modo offline e o requisito central do FascinLead, nao uma funcionalidade secundaria.

Depois do primeiro acesso online, o aplicativo devera abrir e permitir novos cadastros sem conexao. Os dados serao mantidos no IndexedDB por meio do SDK do Firestore. A sincronizacao sera tentada ao salvar online, abrir o aplicativo, recuperar a conexao, voltar ao primeiro plano e tocar em `Sincronizar agora`.

Cada cadastro tera um UUID criado no dispositivo. Novas tentativas usarao o mesmo identificador para evitar duplicacao.

O sistema nao dependera de sincronizacao em segundo plano com o aplicativo fechado, pois navegadores moveis nao garantem essa execucao.

## Seguranca e privacidade

- login Google nao substitui a autorizacao interna;
- somente e-mails previamente autorizados poderao acessar o sistema;
- captadores acessarao apenas os proprios registros;
- gestores acessarao apenas a loja vinculada;
- regras do Firestore validarao acesso, tipos e campos permitidos;
- dados pessoais nao deverao aparecer em URLs, logs ou fixtures de teste;
- o MVP coletara apenas os dados necessarios ao contato;
- CPF, dados de saude, fotos e geolocalizacao exata nao serao coletados inicialmente;
- o formulario exigira confirmacao do consentimento para contato.

## Estrutura planejada

```text
FASCINLEAD/
|-- docs/
|   `-- TDD.md
|-- public/
|   |-- icons/
|   `-- manifest.webmanifest
|-- src/
|   |-- app/
|   |-- components/
|   |-- firebase/
|   |-- pages/
|   |-- services/
|   |-- styles/
|   `-- utils/
|-- tests/
|   |-- e2e/
|   |-- rules/
|   `-- unit/
|-- AGENTS.md
|-- firestore.indexes.json
|-- firestore.rules
|-- firebase.json
|-- index.html
|-- package.json
`-- vite.config.js
```

A estrutura sera criada durante a fundacao do projeto e podera receber pequenos ajustes conforme a implementacao real.

## Documentacao

| Documento | Conteudo |
| --- | --- |
| [Technical Design Document](docs/TDD.md) | Escopo, arquitetura, requisitos, modelo de dados, seguranca, testes e implantacao |
| [Guia para agentes](AGENTS.md) | Contexto e regras obrigatorias para pessoas e agentes de IA que alterarem o repositorio |

Leia o `AGENTS.md` e o TDD antes de iniciar qualquer desenvolvimento.

## Desenvolvimento local

Requisitos:

- Node.js 20.19 ou superior;
- npm 10 ou superior;
- Java para executar a Firebase Emulator Suite.

Instale as dependencias e inicie o servidor:

```bash
npm install
npm run dev
```

No Windows, tambem e possivel iniciar com dois cliques em `INICIAR-FASCINLEAD.bat`. O arquivo instala as dependencias quando necessario, inicia o servidor e abre o navegador automaticamente. Para desligar, pressione `Ctrl+C` na janela do terminal.

Comandos disponiveis:

| Comando | Finalidade |
| --- | --- |
| `npm start` | Iniciar o sistema e abrir o navegador automaticamente |
| `npm run dev` | Iniciar o servidor Vite |
| `npm run build` | Gerar o build de producao |
| `npm run build:pages` | Gerar o build para o GitHub Pages |
| `npm run preview` | Servir o build localmente |
| `npm test` | Executar os testes unitarios |
| `npm run test:watch` | Executar testes em modo continuo |
| `npm run test:e2e` | Executar os fluxos de interface no Chrome mobile e desktop |
| `npm run emulators` | Iniciar os emuladores Firebase |
| `npm run deploy` | Gerar o build e publicar no Firebase Hosting |

## Publicacao no GitHub Pages

O ambiente inicial pode ser publicado pelo workflow `Deploy GitHub Pages` em:

```text
https://gabrielbarbosa0.github.io/FASCINLEAD/
```

Antes da primeira publicacao:

1. Em `Settings > Secrets and variables > Actions`, crie o segredo `VITE_FIREBASE_API_KEY`.
2. Em `Settings > Pages`, selecione `GitHub Actions` como origem da publicacao.
3. No Firebase Authentication, adicione `gabrielbarbosa0.github.io` aos dominios autorizados.
4. Envie as alteracoes para a branch `main` ou execute manualmente o workflow na aba `Actions`.

O build do GitHub Pages usa o caminho `/FASCINLEAD/`. O desenvolvimento local continua usando a raiz `/`.

Copie `.env.example` para `.env.local` e preencha a configuracao web do projeto Firebase. Para usar os emuladores, defina `VITE_USE_FIREBASE_EMULATORS=true`.

Sem configuracao Firebase, o servidor de desenvolvimento oferece um modo local identificado como `DEMO`. Ele existe apenas para validar a interface e nunca deve receber dados reais.

## Plano de entrega

### 1. Fundacao

- inicializar Vite e estrutura modular;
- definir identidade visual e componentes basicos;
- configurar PWA e app shell offline;
- configurar Firebase e Emulator Suite;
- implementar login e autorizacao;
- criar e testar as primeiras Security Rules.

### 2. Captacao offline

- implementar o formulario;
- salvar e consultar registros offline;
- exibir estados de sincronizacao;
- sincronizar sem duplicacao;
- cobrir o fluxo critico com testes.

### 3. Gestao

- adicionar filtros e totais simples;
- restringir dados por perfil e loja;
- implementar exportacao CSV;
- administrar acessos de colaboradores, gestores e administradores.

## Cadastro de acessos

Um administrador pode abrir `Gestao` e selecionar `Gerenciar acessos`, ou usar o atalho `Acessos da equipe` na tela inicial.

1. Informe o nome e o e-mail da conta Google do colaborador.
2. Escolha `Colaborador`, `Gestor` ou `Administrador`.
3. Escolha entre `Loja 02`, `Loja 04`, `Loja 05` e `Loja 06`.
4. Selecione `Salvar acesso`.

O e-mail fica autorizado imediatamente. No primeiro login com Google, o FascinLead cria o perfil do usuario. Salvar novamente um e-mail existente atualiza seu perfil e sua loja; `Bloquear` impede novos acessos sem excluir o historico de captacoes.

### 4. Piloto

- testar com um grupo pequeno de colaboradores;
- validar Android e iPhone reais;
- simular perda e retorno de conexao;
- acompanhar cotas gratuitas do Firebase;
- corrigir problemas antes da liberacao para todas as lojas.

## Contribuicao

Antes de alterar o repositorio:

1. Leia o [AGENTS.md](AGENTS.md).
2. Leia o [TDD](docs/TDD.md).
3. Verifique o estado atual do Git.
4. Preserve alteracoes existentes que nao pertencem a sua tarefa.
5. Avalie impactos em operacao offline, seguranca, privacidade e cotas do Firebase.
6. Implemente testes proporcionais ao risco da mudanca.
7. Atualize a documentacao quando uma decisao permanente mudar.

## Licenca

Consulte o arquivo [LICENSE](LICENSE) deste repositorio.
