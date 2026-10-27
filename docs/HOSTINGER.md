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

## Validacao

- abrir `https://leadflow.icu` em aba anonima;
- entrar com uma conta autorizada;
- criar um cadastro online;
- instalar a PWA e repetir um cadastro offline;
- voltar ao online e confirmar a sincronizacao;
- validar agenda, confirmacoes e retornos;
- testar em Wi-Fi e dados moveis.

O `robots.txt` solicita que buscadores nao indexem o sistema. Isso nao substitui
autenticacao nem regras restritivas no Firebase.
