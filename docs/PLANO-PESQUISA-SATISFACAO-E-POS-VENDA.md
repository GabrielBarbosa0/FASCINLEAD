# Pesquisa de satisfacao e pos-venda

## Decisao de produto

A pesquisa de satisfacao sera planejada como um formulario por link, no estilo Google Forms, enviado principalmente pelo WhatsApp. O LeadFlow sera a central operacional: ele guardara o envio, a resposta, a classificacao, os contatos de pos-venda e o desfecho de cada caso.

Na primeira fase de validacao, o formulario pode ser criado no Google Forms. Quando o fluxo estiver comprovado, o ideal e trazer o formulario para o LeadFlow ou integrar as respostas automaticamente. Dessa forma, a equipe evita exportacoes manuais e preserva o historico completo do cliente.

## Objetivos

- Medir a satisfacao com atendimento, produto e adaptacao aos oculos.
- Identificar rapidamente clientes que precisam de ajuste, orientacao, troca ou novo atendimento.
- Registrar causas de insatisfacao e acompanhar sua resolucao.
- Dar visibilidade para Telemarketing, Pos-venda, Externa e Gestao sem depender de observacoes soltas.
- Produzir indicadores por loja, periodo, produto e equipe, sem expor a identidade do respondente para a pessoa avaliada.

## Canais de coleta

### Link enviado pelo pos-venda

Canal prioritario. O responsavel envia a mensagem manualmente pelo WhatsApp alguns dias apos a entrega ou retirada dos oculos. O cliente responde no proprio celular, com mais privacidade para avaliar a experiencia.

### Visita da equipe externa

A equipe externa pode registrar uma visita e apoiar necessidades praticas, como verificar adaptacao, ajuste e qualidade percebida. A avaliacao de atendimento nao deve ser conduzida como uma conversa sobre a propria pessoa que esta na visita. Caso o cliente queira relatar uma insatisfacao, a externa registra a solicitacao e o pos-venda faz o retorno por outro canal.

### Ligacao do telemarketing

Pode ser usada quando o cliente nao responde ao link. A pessoa registra que a pesquisa foi assistida por telefone, com data, responsavel e respostas dadas pelo cliente.

## Perguntas do formulario

O formulario deve ser curto, caber bem no celular e usar linguagem simples. A meta e levar menos de dois minutos.

1. **Nome do cliente**
   - Resposta curta.
   - Preferencialmente preenchido pelo link individual do LeadFlow no futuro; no Google Forms inicial, pode ser opcional para preservar conforto do cliente.

2. **Telefone para contato**
   - Resposta curta e opcional.
   - Necessario apenas quando o cliente quiser retorno para resolver uma situacao.

3. **Voce esta enxergando bem com seus oculos?**
   - Opcoes: Sim, totalmente / Mais ou menos / Nao estou enxergando bem / Ainda nao recebi ou nao retirei.

4. **Como voce avalia a qualidade dos oculos?**
   - Escala de 1 a 5: muito ruim, ruim, regular, boa, excelente.

5. **Como voce avalia o atendimento recebido?**
   - Escala de 1 a 5: muito ruim, ruim, regular, bom, excelente.

6. **Sua compra, entrega ou retirada aconteceu como esperado?**
   - Opcoes: Sim / Parcialmente / Nao.

7. **Teve algum problema ou algo que poderiamos melhorar?**
   - Resposta longa e opcional.

8. **Voce gostaria que nossa equipe entrasse em contato para ajudar?**
   - Opcoes: Sim / Nao.

9. **Por qual canal prefere receber esse contato?**
   - Exibir somente quando a resposta anterior for Sim.
   - Opcoes: WhatsApp / Ligacao / Visita da equipe externa.

10. **Autoriza usar sua resposta de forma anonima para melhorar nossos servicos?**
    - Opcoes: Sim / Nao.

## Mensagem inicial sugerida

> Ola! Aqui e da Fascinante. Queremos saber se esta tudo bem com seus oculos e com sua experiencia. A pesquisa e rapida e leva menos de dois minutos. Sua resposta nos ajuda a melhorar. [link da pesquisa]

O texto final deve ser aprovado pela gestao antes do uso e pode variar por campanha.

## Classificacao interna

Depois de recebida, cada resposta deve receber uma situacao no LeadFlow:

- `Nao enviada`
- `Enviada`
- `Respondida - satisfeita`
- `Respondida - neutra`
- `Respondida - insatisfeita`
- `Precisa de ajuste`
- `Possivel defeito`
- `Problema de atendimento`
- `Problema de entrega ou retirada`
- `Retorno solicitado`
- `Em tratamento pelo pos-venda`
- `Resolvida`
- `Sem resposta`

Regras iniciais sugeridas:

- Nota 1 ou 2 em atendimento ou qualidade: classificar como insatisfeita e abrir caso de pos-venda.
- Resposta “Nao estou enxergando bem”: classificar como precisa de ajuste e priorizar retorno.
- Entrega ou retirada “Nao”: abrir caso de acompanhamento.
- Pedido explicito de contato: criar retorno para o setor indicado pelo cliente.

## Fluxo operacional futuro

1. O LeadFlow identifica clientes elegiveis apos entrega, retirada ou prazo definido pela loja.
2. O pos-venda envia o link manualmente e registra o envio.
3. A resposta chega ao LeadFlow por integracao ou importacao controlada enquanto o formulario for externo.
4. Respostas positivas ficam registradas no historico do cliente.
5. Respostas com alerta criam uma tarefa para pos-venda, telemarketing ou externa.
6. O responsavel registra cada tentativa de contato, providencia e resolucao.
7. A gestao acompanha os indicadores e os motivos mais frequentes de insatisfacao.

## Dados que precisarao ser guardados

- Identificacao do cliente e loja.
- Data de envio, canal e responsavel pelo envio.
- Data de resposta e origem: link, telefone ou visita externa.
- Respostas completas da pesquisa e classificacao calculada.
- Motivo de insatisfacao, quando houver.
- Responsavel pelo tratamento, prazos, contatos realizados e desfecho.
- Vinculo com compra, pedido ou agendamento quando esse dado estiver disponivel.

Esses eventos devem aparecer no historico do lead, sem substituir observacoes clinicas ou registros de agenda.

## Permissoes futuras

- **Telemarketing:** consultar listas, enviar link manualmente, registrar contato e respostas por telefone.
- **Pos-venda:** consultar e tratar todos os casos autorizados da loja, classificar insatisfacoes e registrar resolucoes.
- **Externa:** registrar visita, necessidades praticas e solicitacoes de retorno; nao deve visualizar dados sensiveis desnecessarios nem ser a unica fonte de avaliacao do proprio atendimento.
- **Gestao:** configurar campanhas, consultar indicadores e acompanhar casos.

## Indicadores para a futura dashboard

- Pesquisas enviadas, respondidas e taxa de resposta.
- Percentual de satisfeitos, neutros e insatisfeitos.
- Nota media de atendimento e qualidade.
- Clientes que relataram dificuldade para enxergar.
- Principais motivos de insatisfacao.
- Casos abertos, em tratamento, resolvidos e tempo medio de resolucao.
- Comparativo por loja e periodo.

## Limites da primeira implementacao

Esta funcionalidade fica planejada para depois da entrega e dos treinamentos iniciais. Nao deve ser ativada junto com os fluxos atuais sem definir:

- Prazo entre compra e envio da pesquisa.
- Responsavel por cada loja.
- Texto final das mensagens.
- SLA de retorno para cada tipo de problema.
- Politica de privacidade e uso das respostas.
- Forma de vinculacao segura entre resposta externa e cadastro do cliente.
