# Orcamento de infraestrutura do FascinLead

## Data e objetivo

Estimativa elaborada em **20/10/2026** para manter o FascinLead em producao com dominio proprio, banco de dados, autenticacao, hospedagem e copias de seguranca.

Este documento apresenta os custos de infraestrutura e a manutencao mensal do sistema. Funcionalidades maiores devem ser combinadas separadamente.

## Resumo executivo

O FascinLead ja possui banco de dados: o **Cloud Firestore**. O sistema tambem usa Firebase Authentication, Firebase Hosting e possui uma Cloud Function administrativa. Portanto, nao e necessario contratar agora um servidor VPS nem um banco SQL separado.

O GitHub guarda o codigo-fonte, mas a versao de producao atual e servida pelo Firebase Hosting. A recomendacao e manter a arquitetura e trocar o projeto para o plano **Firebase Blaze**, que nao possui mensalidade fixa e cobra apenas o consumo que ultrapassar as franquias gratuitas.

Para a operacao atual, a previsao realista e:

| Item | Estimativa mensal | Estimativa anual |
| --- | ---: | ---: |
| Dominio `.com.br` | R$ 3,33 | R$ 40,00 |
| Firebase Hosting | R$ 0,00 a R$ 5,00 | R$ 0,00 a R$ 60,00 |
| Firestore | R$ 0,00 a R$ 10,00 | R$ 0,00 a R$ 120,00 |
| Firebase Authentication | R$ 0,00 | R$ 0,00 |
| Cloud Functions | R$ 0,00 a R$ 5,00 | R$ 0,00 a R$ 60,00 |
| Backups do Firestore | R$ 0,00 a R$ 5,00 | R$ 0,00 a R$ 60,00 |
| **Total tecnico esperado** | **R$ 3,33 a R$ 28,33** | **R$ 40,00 a R$ 340,00** |
| **Reserva recomendada** | **R$ 100,00** | **R$ 1.200,00** |

A reserva de R$ 100,00 mensais nao significa que todo esse valor sera consumido. O custo tecnico atual tende a ser menor, mas a margem evita surpresas com crescimento de uso, backups e variacao cambial.

O valor mensal apresentado para manter o sistema sera de **R$ 350,00**, formado por **R$ 100,00 de reserva para infraestrutura** e **R$ 250,00 de manutencao do sistema**.

## Arquitetura atual

| Necessidade | Solucao atual | Precisa contratar outro produto? |
| --- | --- | --- |
| Site e PWA | Firebase Hosting | Nao |
| Banco de dados | Cloud Firestore | Nao |
| Login por e-mail e senha | Firebase Authentication | Nao |
| Regras de acesso | Firestore Security Rules | Nao |
| Rotina administrativa de senha | Cloud Functions | Requer ativar o Blaze |
| Dominio e HTTPS | Dominio proprio apontado para o Firebase | Apenas registrar o dominio |
| Certificado SSL | Incluido no Firebase Hosting | Nao |
| Arquivos e imagens futuras | Cloud Storage, se necessario | Somente quando essa funcao existir |

## Custos detalhados

### 1. Dominio proprio

Um dominio `.com.br` custa **R$ 40,00 por ano** no Registro.br, equivalente a R$ 3,33 por mes. O dominio exato desejado precisa estar disponivel no momento do registro.

O Firebase Hosting permite conectar dominio proprio e inclui certificado SSL sem custo adicional. Nao e necessario comprar certificado HTTPS.

Fonte: [Registro.br - dominios](https://registro.br/dominio) e [Firebase Hosting](https://firebase.google.com/products/hosting).

### 2. Firebase Hosting

O frontend do FascinLead e estatico e o build atual tem menos de 1 MB de arquivos precacheados. O Firebase oferece gratuitamente ate 10 GB de armazenamento de Hosting e 10 GB mensais de transferencia. No Blaze, o excedente custa atualmente **US$ 0,026 por GB armazenado** e **US$ 0,15 por GB transferido**.

Na operacao atual, o custo esperado e zero. Mesmo com crescimento moderado, o custo tende a permanecer baixo porque os arquivos sao pequenos e distribuidos por CDN.

Fonte: [Firebase Hosting - cotas e precos](https://firebase.google.com/docs/hosting/usage-quotas-pricing).

### 3. Banco de dados Firestore

O Firestore e o banco de dados principal do FascinLead. Ele armazena leads, agendamentos, acessos, configuracoes, metas, retornos e servicos da agenda.

A franquia gratuita diaria inclui:

- 50.000 leituras de documentos.
- 20.000 gravacoes.
- 20.000 exclusoes.
- 1 GiB de dados armazenados.
- 10 GiB mensais de transferencia de saida.

Para a fase atual, esses limites sao amplos. O ponto que merece acompanhamento sao as telas em tempo real: listeners do Firestore contabilizam leituras ao abrir, reconectar e receber alteracoes.

Na tabela oficial vigente, o excedente da edicao Standard custa a partir de **US$ 0,03 por 100 mil leituras**, **US$ 0,09 por 100 mil gravacoes** e **US$ 0,01 por 100 mil exclusoes**, alem do armazenamento e trafego. Valores finais podem variar por regiao e moeda de faturamento.

Fonte: [Firestore - precos e franquias](https://firebase.google.com/docs/firestore/pricing) e [Google Cloud Firestore Pricing](https://cloud.google.com/firestore/pricing).

### 4. Login e usuarios

O login atual usa e-mail e senha do Firebase Authentication. Para o tamanho previsto da equipe, o custo e zero. Mesmo com Identity Platform no Blaze, existe franquia de ate 50.000 usuarios ativos mensais para provedores de e-mail, sociais, anonimos e personalizados.

E-mails de redefinicao de senha tambem possuem cotas proprias. No Blaze, a documentacao informa limite de 10.000 e-mails de redefinicao por dia, muito acima da necessidade atual.

Fonte: [Firebase Authentication](https://firebase.google.com/docs/auth) e [limites do Authentication](https://firebase.google.com/docs/auth/limits).

### 5. Cloud Functions

O projeto possui uma funcao administrativa para alteracao de senha de colaboradores. A publicacao de Cloud Functions requer uma conta de faturamento, mas o baixo volume do FascinLead deve permanecer dentro das franquias gratuitas de invocacao e processamento.

Pode existir uma pequena cobranca de armazenamento da imagem de deploy no Artifact Registry. Foi reservada a faixa de R$ 0,00 a R$ 5,00 mensais para cobrir essa possibilidade.

Fonte: [Cloud Run functions - precos](https://cloud.google.com/functions/pricing-1stgen).

### 6. Backups

Backups agendados do Firestore exigem o plano Blaze. Eles sao recomendados porque protegem contra exclusao acidental e erros de aplicacao. A cobranca depende do tamanho do banco e do tempo de retencao.

Como a base atual e muito pequena, o custo deve ficar abaixo de R$ 5,00 mensais. Recomenda-se inicialmente:

- Backup diario com retencao de 14 dias.
- Backup semanal com retencao de 8 semanas.
- Teste documentado de restauracao pelo menos uma vez por trimestre.

Fonte: [Firestore - backup e restauracao](https://firebase.google.com/docs/firestore/backups).

## Cenarios de crescimento

As faixas abaixo sao reservas de planejamento, nao mensalidades contratadas. Foi usado cambio de seguranca de **R$ 6,00 por dolar** para transformar os precos publicados em dolar e absorver oscilacoes.

| Cenario | Premissa aproximada | Gasto tecnico esperado | Reserva mensal sugerida |
| --- | --- | ---: | ---: |
| Operacao atual | Ate 30 usuarios internos, 4 unidades e poucos milhares de cadastros | R$ 3 a R$ 30 | **R$ 100** |
| Crescimento regional | Ate 100 usuarios, 20 unidades e uso diario constante | R$ 20 a R$ 100 | **R$ 150** |
| Operacao maior | Centenas de usuarios, API de CRM e alto volume de consultas | R$ 100 a R$ 400 | **R$ 600** |

O custo nao cresce diretamente pelo numero total de leads. Ele cresce principalmente pela quantidade de documentos lidos repetidamente, trafego, chamadas de backend e arquivos armazenados.

## Dimensionamento para 60 colaboradores

Uma operacao com **60 funcionarios** esta confortavelmente dentro da capacidade dos servicos usados pelo FascinLead. Os clientes cadastrados nao contam como usuarios do Firebase Authentication enquanto nao tiverem login proprio; eles sao documentos no Firestore. Portanto, nessa situacao haveria aproximadamente 60 usuarios autenticados, muito abaixo da franquia de 50.000 usuarios ativos mensais.

### Estimativa de uso

Um exemplo conservador para os 60 colaboradores:

- 60 pessoas usando o sistema todos os dias.
- 5 aberturas ou atualizacoes relevantes por pessoa por dia.
- Cerca de 100 documentos lidos em cada abertura.
- Aproximadamente 30.000 leituras por dia.

Esse exemplo ainda ficaria dentro das 50.000 leituras diarias gratuitas do Firestore. Uma operacao mais intensa, com gestores abrindo repetidamente agenda, retornos e dashboard, pode ultrapassar a franquia, mas o excedente continua barato:

| Consumo de leitura | Excedente aproximado | Custo mensal estimado em dolar | Conversao de seguranca a R$ 6,00 |
| --- | ---: | ---: | ---: |
| 50 mil leituras/dia | Nenhum | US$ 0,00 | R$ 0,00 |
| 200 mil leituras/dia | 150 mil/dia | US$ 1,35 | R$ 8,10 |
| 1 milhao de leituras/dia | 950 mil/dia | US$ 8,55 | R$ 51,30 |

Os valores consideram a franquia diaria e o preco publicado de US$ 0,03 por 100 mil leituras excedentes. Trafego, armazenamento e outros produtos sao cobrados separadamente, se ultrapassarem suas proprias franquias.

### Quantidade de clientes

Dezenas ou centenas de milhares de clientes podem ser armazenados no Firestore. O volume total armazenado tende a custar pouco porque cada cadastro e pequeno. O que exige atencao e evitar que uma tela leia todos esses registros de uma vez.

O FascinLead ja aplica os seguintes limites de interface:

- 100 cadastros na lista pessoal do captador.
- 300 registros por consulta na gestao, relatorios e dashboard.
- 500 agendamentos por mes na agenda consultada.
- 500 retornos de equipe por consulta.

Esses limites protegem desempenho e custo, mas representam o primeiro ponto de evolucao para uma operacao grande. Se uma loja ultrapassar 500 exames mensais ou a gestao precisar analisar periodos com mais de 300 registros de uma vez, sera necessario adicionar paginacao e agregacoes no backend. Os dados nao seriam perdidos; apenas a tela atual pediria filtros menores.

### Orcamento recomendado para esse porte

Para **60 colaboradores, 4 unidades e muitos clientes**, a previsao recomendada e:

| Categoria | Faixa mensal esperada |
| --- | ---: |
| Dominio proprio | R$ 3,33 |
| Hosting, banco, login, funcoes e backups | R$ 10,00 a R$ 60,00 |
| **Gasto tecnico esperado** | **R$ 13,33 a R$ 63,33** |
| **Reserva mensal recomendada** | **R$ 100,00** |

Essa reserva cobre uma operacao interna intensa sem contratar servidor separado. Caso sejam adicionados portal para clientes, anexos, imagens de exames, WhatsApp oficial ou integracao constante com CRM, o calculo deve ser revisto.

## Custos que nao sao necessarios agora

- Servidor VPS dedicado.
- Banco PostgreSQL ou MySQL separado.
- Certificado SSL pago.
- CDN contratada separadamente.
- Servico pago de login.
- Hospedagem paga no GitHub.

Esses componentes so devem ser reconsiderados se surgirem exigencias tecnicas que o Firebase nao atenda, necessidade de isolamento regulatorio, consultas relacionais complexas ou uma escala muito superior a atual.

## Custos opcionais futuros

Nao estao incluidos no total porque ainda nao fazem parte da operacao atual:

- Envio oficial de mensagens pela API do WhatsApp.
- E-mail transacional com marca propria.
- Caixa de e-mail corporativa no dominio.
- Armazenamento de exames, imagens ou documentos.
- Integracao com SavWin ou CRM externo.
- Observabilidade avancada e suporte com SLA.
- Horas de manutencao, desenvolvimento e atendimento aos usuarios.

## Manutencao do sistema

A manutencao do FascinLead tera o valor de **R$ 250,00 por mes**. Essa taxa existe para manter uma pessoa responsavel pela ferramenta quando surgir algum problema, inclusive fora do horario normal de trabalho quando o sistema ficar indisponivel.

A manutencao mensal inclui:

- Verificacao do funcionamento do sistema.
- Diagnostico e correcao de erros.
- Suporte em caso de indisponibilidade.
- Atualizacoes de seguranca e dependencias.
- Pequenos ajustes e melhorias na ferramenta.

Funcionalidades maiores, integracoes novas ou mudancas que exigirem muitas horas de desenvolvimento devem ser avaliadas e combinadas separadamente.

### Valor mensal apresentado

| Item | Valor mensal |
| --- | ---: |
| Reserva para infraestrutura | R$ 100,00 |
| Manutencao do sistema | R$ 250,00 |
| **Total mensal** | **R$ 350,00** |

O custo anual previsto e de **R$ 4.200,00**. A reserva de infraestrutura cobre dominio, Firebase e uma margem de seguranca, mesmo que o consumo real seja menor em alguns meses.

## Recomendacao de contratacao

1. Manter Firebase Hosting, Firestore e Authentication.
2. Migrar o projeto para o plano Blaze para liberar Cloud Functions e backups.
3. Registrar um dominio `.com.br` diretamente no Registro.br.
4. Apontar o dominio para o Firebase Hosting e usar o SSL incluido.
5. Criar um orcamento de alerta de **R$ 100,00 por mes**, com avisos em 50%, 80% e 100%.
6. Revisar consumo e faturamento todos os meses durante os tres primeiros meses.
7. Rever este documento quando houver mais unidades, API externa, anexos ou WhatsApp oficial.

Importante: alertas comuns de orcamento avisam, mas nao interrompem automaticamente os servicos. Alguns produtos permitem limite de gastos especifico; para os demais, e necessario monitoramento ou automacao.

Fonte: [Firebase - alertas de orcamento](https://firebase.google.com/docs/projects/billing/budget-alerts).

## Decisao recomendada

Para a fase atual, o valor apresentado sera de **R$ 350,00 por mes**: R$ 100,00 reservados para infraestrutura e R$ 250,00 para manutencao do sistema. Isso representa **R$ 4.200,00 por ano**.

Nao recomendo migrar para outro provedor nem criar um servidor proprio agora. O melhor investimento e ativar faturamento controlado, backups e alertas, mantendo a arquitetura simples que ja esta funcionando.
