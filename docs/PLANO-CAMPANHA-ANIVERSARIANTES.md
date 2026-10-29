# Campanha de aniversariantes

## Situacao atual

A base foi preparada, mas a campanha permanece desativada por padrao. O LeadFlow nao envia mensagens, nao cria vouchers e nao promete cashback automaticamente.

Cada novo cadastro passa a guardar `birthMonthDay` no formato `MM-DD`, alem da data de nascimento ja existente. Registros antigos continuam elegiveis porque a lista futura tambem calcula essa chave a partir de `birthDate`.

## Lista operacional futura

A lista de aniversariantes devera mostrar clientes de hoje e dos proximos sete dias, com nome, telefone, loja, data do aniversario, situacao do agendamento e historico de contatos. A janela de dias sera configuravel por campanha.

O atendimento sera manual: a pessoa responsavel escolhe o cliente, envia a mensagem pelo canal habitual e registra o contato. Assim, o time mantem controle sobre a estrategia e evita liberar um beneficio sem aprovacao.

## Beneficios previstos

Os tipos preparados sao:

- Voucher: credito para uso nas condicoes da campanha.
- Cashback: valor ou percentual devolvido conforme as regras da campanha.

Cada campanha futura tera status, vigencia, lojas participantes, tipo e valor do beneficio, condicoes de uso e modelo de mensagem. Um beneficio nao deve ser interpretado como desconto automatico: ele so vale depois que a campanha estiver ativa e o contato for registrado.

Exemplo de regra que podera ser criada: em compras a partir de R$ 400,00, liberar voucher de R$ 50,00. O valor, a compra minima, a validade e o limite de uso precisarao ser definidos na propria campanha antes da ativacao.

## Historico do lead

O historico esta preparado para receber os eventos `birthday_benefit_planned` e `birthday_congratulated`, incluindo tipo, valor e descricao do beneficio. Isso permitira saber quais clientes receberam a abordagem e qual oferta foi apresentada, sem misturar essa informacao nas observacoes gerais do cadastro.

## Proxima etapa

Quando a estrategia estiver aprovada, criar uma aba operacional para Telemarketing com filtros por loja e periodo, acao manual de WhatsApp e registro de contato. A habilitacao da campanha deve ficar restrita aos perfis de gestao.
