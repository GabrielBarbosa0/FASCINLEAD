# Publicacao na Hostinger

O `leadflow.icu` hospeda apenas o frontend estatico. Authentication, Firestore,
regras e funcoes continuam no projeto Firebase `fascinlead`. Nao crie banco
MySQL na Hostinger para esta aplicacao.

## Primeiro acesso

1. Registre o dominio usando os dados reais do titular ou da empresa.
2. No hPanel, escolha site PHP/HTML e a opcao de enviar os arquivos do site.
3. Use o arquivo `leadflow-hostinger.zip` gerado na raiz do repositorio.
4. Confira se `index.html`, `assets`, `sw.js` e `.htaccess` ficaram diretamente
   dentro de `public_html`, sem uma pasta `dist` intermediaria.
5. Ative o SSL e force HTTPS no hPanel.

## Firebase Authentication

Antes de testar o login em producao:

1. Abra Firebase Console > Authentication > Settings > Authorized domains.
2. Adicione `leadflow.icu`.
3. Adicione tambem `www.leadflow.icu` somente se essa variante for usada.
4. Mantenha o `authDomain` original `fascinlead.firebaseapp.com` no build. O
   aplicativo usa login por popup e nao precisa hospedar o handler na Hostinger.

## Atualizacoes

Execute `npm run build`, compacte o conteudo de `dist` e substitua os arquivos
em `public_html`. Nao envie `.env.local`, codigo-fonte, credenciais do SavWin,
chaves administrativas ou arquivos de conta de servico.

O ZIP deve usar `/` nos caminhos internos, por exemplo
`assets/index-ABC123.js`. Um ZIP criado no Windows com entradas no formato
`assets\index-ABC123.js` pode ser extraido de forma incompleta pela Hostinger.
Depois da extracao, confirme que o arquivo referenciado por `index.html` existe
em `public_html/assets` antes de encerrar a publicacao.

## Incidente de agendamento e cache de 27/10/2026

### Sintomas observados

- o cadastro offline sincronizava e aparecia em outro dispositivo;
- o autor conseguia fazer o primeiro agendamento em alguns fluxos, mas recebia
  `Seu perfil nao possui permissao para alterar este cadastro` ao reagendar;
- uma conta administrativa conseguia alterar o mesmo cadastro;
- depois de uma publicacao, o site abriu em branco e o console informou `404`
  para um arquivo `assets/index-*.js`.

### Causas combinadas

1. A regra especial do Firestore autorizava o autor somente no primeiro
   agendamento. Um reagendamento posterior dependia de `leads.edit_own`.
2. O formulario reenviava o cadastro inteiro ao alterar data ou horario. Uma
   pequena diferenca de normalizacao entre dispositivos podia transformar a
   operacao de agenda em uma edicao geral nao autorizada.
3. A ordem das validacoes fazia algumas operacoes ultrapassarem o limite fixo
   de **1.000 expressoes avaliadas por requisicao**. O Firebase devolvia
   `permission-denied`, embora o problema real fosse o custo da regra. Esse
   limite tambem existe nos planos pagos.
4. O Service Worker aguardava confirmacao para ativar a nova versao, mantendo
   dispositivos no JavaScript anterior.
5. Um ZIP com separadores de caminho do Windows foi extraido sem a pasta
   `assets` completa. O `index.html` continuou apontando para um chunk removido.

### Solucao aplicada

- a regra `isOwnerAppointmentUpdate` permite ao autor agendar e reagendar,
  alterando somente os campos da agenda;
- perfis sem `leads.edit_own` enviam apenas servico, data, horario, duracao,
  situacao do agendamento e `updatedAtServer`;
- a verificacao de `affectedKeys()` ocorre primeiro, encerrando cedo operacoes
  que nao sao de agenda e mantendo as regras abaixo do limite de expressoes;
- lead e blocos de horario sao atualizados no mesmo lote atomico;
- o PWA usa `autoUpdate` e `skipWaiting`, mas uma aba aberta ainda apresenta
  `Atualizar agora` antes de recarregar para nao interromper um formulario;
- os pacotes para Hostinger usam caminhos ZIP portateis com `/`.

### Diagnostico rapido se o erro reaparecer

1. Execute `npm test` e `npm run test:rules`. Procure no log do emulador por
   `maximum of 1000 expressions`, nao apenas pelo codigo `permission-denied`.
2. Confirme que `firestore.rules` foi publicado no projeto `fascinlead`.
3. Abra o site em aba anonima. Se funcionar apenas nela, investigue o Service
   Worker e a versao em cache.
4. Compare o chunk `assets/index-*.js` citado pelo HTML com o citado por
   `sw.js` e teste a URL desse arquivo diretamente. Qualquer `404` indica
   publicacao incompleta, nao erro do Firebase.
5. Na Hostinger, confirme `index.html`, `sw.js`, `.htaccess` e `assets`
   diretamente em `public_html`, sem uma pasta `dist` intermediaria.
6. Repita o fluxo completo: cadastro offline, reconexao, aparicao em outro
   dispositivo, primeiro agendamento e troca posterior de data e horario.

Nao limpe os dados do site nem desinstale a PWA enquanto houver cadastro com
falha de sincronizacao. Essa limpeza remove o IndexedDB e pode apagar a unica
copia ainda existente no aparelho.

## Validacao

- abrir `https://leadflow.icu` em aba anonima;
- entrar com uma conta autorizada;
- criar um cadastro online;
- instalar a PWA e repetir um cadastro offline;
- voltar ao online e confirmar a sincronizacao;
- agendar o cadastro sincronizado e depois alterar sua data ou horario;
- validar agenda, confirmacoes e retornos;
- testar em Wi-Fi e dados moveis.

O `robots.txt` solicita que buscadores nao indexem o sistema. Isso nao substitui
autenticacao nem regras restritivas no Firebase.
