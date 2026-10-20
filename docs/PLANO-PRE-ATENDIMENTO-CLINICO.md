# Plano futuro - Pre-atendimento clinico e agenda medica

| Campo | Valor |
| --- | --- |
| Status | Planejado, sem implementacao iniciada |
| Prioridade atual | Posterior a captacao e ao gerenciamento da agenda |
| Registrado em | 19/10/2026 |
| Responsavel pela validacao clinica | A definir com o medico responsavel |

## 1. Contexto

O FascinLead deve continuar priorizando a captacao rapida de leads e o gerenciamento operacional da agenda. Informacoes clinicas detalhadas nao devem aumentar o formulario usado pelo captador na rua nem expor dados de saude a perfis que nao precisam deles.

Em uma etapa futura, o sistema podera oferecer um fluxo de pre-atendimento para que a recepcao complemente as informacoes do paciente quando ele chegar a loja ou a clinica. O medico recebera um resumo antes do exame, com condicoes relevantes, resultados apresentados, origem e atualidade das informacoes e alertas definidos pelo protocolo da clinica.

Este documento registra a direcao aprovada para essa evolucao. Ele nao autoriza sua implementacao imediata e nao altera o foco atual do produto.

## 2. Objetivos futuros

- Preservar a velocidade e a simplicidade da captacao.
- Separar dados comerciais, cadastrais e clinicos.
- Permitir que a recepcao prepare o atendimento depois da chegada do paciente.
- Dar ao medico contexto relevante antes do exame de vista.
- Sinalizar informacoes incompletas, desatualizadas ou que merecam revisao.
- Registrar a origem, a data e o profissional responsavel por cada informacao.
- Restringir dados de saude aos perfis que realmente precisam acessa-los.
- Impedir que dados clinicos sejam exportados para CRMs por padrao.

## 3. Principios de produto

1. O cadastro de lead nao sera transformado em ficha clinica.
2. O captador registra apenas dados necessarios para contato e agendamento.
3. Informacoes clinicas detalhadas serao coletadas preferencialmente na clinica.
4. Uma condicao relatada pelo paciente nao equivale a diagnostico confirmado.
5. O sistema sinalizara fatos registrados, mas nao fara diagnostico nem recomendacao medica automatica.
6. Limites e prioridades clinicas deverao ser aprovados pelo medico responsavel.
7. Ausencia de informacao nao podera ser interpretada como ausencia de risco.
8. Cada perfil visualizara somente os dados necessarios para sua funcao.

## 4. Fluxo operacional proposto

### 4.1 Captacao

Responsavel: captador.

Dados esperados:

- nome;
- telefone ou WhatsApp;
- loja;
- data e horario do agendamento;
- interesse principal;
- ametropias e condicoes conhecidas, de forma opcional;
- observacao rapida.

Se o paciente mencionar espontaneamente uma condicao, o captador podera marcar algo simples, como `Diabetes relatada`. O captador nao devera ser obrigado a perguntar ou registrar HbA1c, medicamentos, tempo de diagnostico, laudos ou outros detalhes clinicos.

### 4.2 Chegada e identificacao

Responsavel: recepcao ou profissional autorizado.

Ao chegar a clinica, o paciente sera localizado pelo agendamento. Nesse momento poderao ser atualizados CPF e outros dados de identificacao que nao estavam disponiveis durante a captacao.

Estado sugerido: `Chegou a clinica`.

### 4.3 Pre-atendimento

Responsavel: recepcao, profissional de triagem ou o proprio paciente, conforme o processo definido pela clinica.

A agenda devera oferecer uma acao `Preparar atendimento`. A etapa podera registrar:

- confirmacao das condicoes anteriormente relatadas;
- tipo e tempo aproximado de diagnostico de diabetes;
- valor e data da ultima HbA1c apresentada;
- diagnosticos oculares anteriores;
- hipertensao e outras condicoes relevantes;
- medicamentos de interesse clinico;
- exames ou documentos apresentados;
- observacoes destinadas ao medico;
- origem de cada informacao: paciente, documento ou profissional.

Uma evolucao possivel e disponibilizar um link ou QR Code para o paciente preencher parte das informacoes enquanto aguarda. A recepcao devera revisar o conteudo antes de libera-lo ao medico.

Estado sugerido: `Pre-atendimento pendente` ou `Pre-atendimento concluido`.

### 4.4 Atendimento medico

Responsavel: medico ou profissional clinico autorizado.

O medico acessara uma visao objetiva chamada `Resumo pre-exame`, sem precisar navegar pelo cadastro comercial completo. Essa visao devera apresentar:

- condicoes relevantes;
- resultados e datas informados;
- origem e estado de verificacao das informacoes;
- medicamentos registrados;
- alertas do protocolo da clinica;
- historico clinico disponivel;
- observacoes da recepcao.

O medico podera confirmar, corrigir ou complementar os dados. Uma informacao revisada por profissional devera ser distinguida daquela apenas relatada pelo paciente.

Estado sugerido: `Aguardando medico` e, depois, `Atendido`.

### 4.5 Sequencia resumida

`Lead captado -> Agendado -> Chegou a clinica -> Pre-atendimento pendente -> Pre-atendimento concluido -> Aguardando medico -> Atendido`

## 5. Informacoes clinicas inicialmente consideradas

### 5.1 Diabetes

O sistema nao usara um campo generico de `nivel da diabetes`. Quando disponiveis, os dados deverao ser objetivos:

- tipo 1, tipo 2, gestacional ou nao informado;
- ano aproximado do diagnostico;
- HbA1c, com valor, unidade e data do exame;
- fonte do dado: relato, exame apresentado ou registro profissional;
- retinopatia diabetica conhecida: sim, nao ou nao sabe;
- tratamento informado;
- observacao clinica.

A HbA1c representa uma media de glicose dos ultimos meses, mas nao determina sozinha o comprometimento ocular. Tempo de diabetes, pressao arterial, lipidios e retinopatia existente tambem podem ser relevantes. O sistema devera exibir os dados ao medico, nao concluir a gravidade por conta propria.

### 5.2 Outras condicoes candidatas

A lista final dependera de validacao medica. Candidatas para estudo:

- hipertensao arterial;
- doenca renal;
- doencas autoimunes ou inflamatorias;
- doenca da tireoide, incluindo doenca de Graves;
- anemia falciforme e outras hemoglobinopatias;
- gravidez em paciente com diabetes preexistente;
- uso prolongado de corticoides ou outros medicamentos relevantes;
- glaucoma;
- catarata;
- ceratocone;
- retinopatias;
- cirurgia ocular anterior.

Nem todas essas condicoes afetam o exame da mesma forma. A inclusao, os campos complementares e os alertas deverao ser definidos pelo medico responsavel.

## 6. Alertas e experiencia na agenda

### 6.1 Agenda da recepcao

Exibira estados operacionais, por exemplo:

- aguardando chegada;
- pre-atendimento pendente;
- pre-atendimento concluido;
- pronto para o medico.

### 6.2 Agenda do medico

Exibira marcadores clinicos discretos e um resumo sob demanda, por exemplo:

- diabetes;
- HbA1c informada;
- hipertensao;
- retinopatia relatada;
- dados clinicos desatualizados;
- informacoes ainda nao confirmadas.

### 6.3 Regras para alertas

- Evitar textos como `diabetes grave` calculados automaticamente.
- Preferir mensagens factuais, como `HbA1c informada: 9,2% em 10/09/2026`.
- Mostrar claramente quando o dado foi apenas relatado.
- Tornar configuraveis os prazos de atualidade e as regras de destaque.
- Exigir aprovacao do medico responsavel antes de ativar limites clinicos.
- Nao enviar diagnosticos ou resultados sensiveis em notificacoes externas.
- Nao substituir avaliacao, diagnostico ou decisao do profissional.

## 7. Separacao de dados

O modelo futuro devera evitar concentrar tudo no documento do lead.

| Dominio | Exemplos | Acesso esperado |
| --- | --- | --- |
| Lead | Contato, captacao, loja, interesse e agendamento | Captador e equipe autorizada |
| Paciente | CPF e identificacao consolidada | Recepcao e perfis autorizados |
| Perfil clinico | Condicoes, exames apresentados e medicamentos | Recepcao clinica e medico |
| Atendimento | Revisoes, observacoes e confirmacoes profissionais | Profissionais clinicos autorizados |

O CPF podera conectar o cadastro captado ao paciente e a outros sistemas, mas essa associacao devera ser auditavel. A API destinada a CRMs devera excluir informacoes clinicas por padrao e exigir uma finalidade e permissao especificas para qualquer compartilhamento futuro.

## 8. Perfis e permissoes futuras

Permissoes candidatas:

- registrar chegada do paciente;
- preencher pre-atendimento;
- visualizar resumo clinico;
- editar informacoes relatadas;
- confirmar informacoes como profissional;
- anexar e visualizar documentos;
- configurar protocolos e alertas;
- consultar auditoria de alteracoes.

Direcao inicial:

- captador: ve apenas dados comerciais, agendamento, comparecimento e retorno;
- recepcao: atualiza identificacao e pre-atendimento;
- medico: consulta e valida o resumo clinico;
- gestor: acompanha a operacao, com acesso clinico somente quando houver necessidade e permissao;
- administrador: configura acessos, sem pressupor acesso irrestrito ao conteudo clinico.

## 9. Privacidade e seguranca

Dados de saude sao dados pessoais sensiveis. A implementacao devera incluir:

- finalidade e base legal documentadas;
- coleta apenas do necessario;
- controle de acesso no banco, nao apenas na interface;
- trilha de auditoria de leitura e alteracao quando aplicavel;
- registro de autor, origem e data de cada informacao;
- politica de retencao e correcao;
- protecao de anexos;
- exclusao de dados clinicos das exportacoes comerciais;
- revisao juridica e clinica antes do piloto.

## 10. Plano de execucao futuro

### Fase 0 - Descoberta operacional

- acompanhar a rotina real de captacao, recepcao e exame;
- identificar quem coleta, confirma e utiliza cada dado;
- entrevistar o medico responsavel;
- definir o conjunto minimo de informacoes;
- aprovar a linguagem dos alertas;
- mapear requisitos legais e de sigilo.

### Fase 1 - Separacao estrutural

- separar lead, paciente e informacoes clinicas no modelo de dados;
- criar permissoes especificas;
- garantir que APIs e CSV comerciais nao exponham dados de saude;
- implementar auditoria minima.

### Fase 2 - Chegada e pre-atendimento

- adicionar o estado de chegada;
- criar a acao `Preparar atendimento` na agenda;
- implementar formulario progressivo para recepcao;
- registrar origem e data das informacoes;
- permitir pendencias sem bloquear indevidamente a agenda.

### Fase 3 - Agenda medica

- criar uma visao de agenda adequada ao medico;
- implementar o `Resumo pre-exame`;
- exibir marcadores clinicos discretos;
- permitir confirmacao e correcao profissional.

### Fase 4 - Protocolos e alertas

- cadastrar regras aprovadas pelo medico;
- configurar atualidade dos dados;
- diferenciar informacao, atencao e prioridade;
- validar alertas com casos reais anonimizados;
- impedir classificacoes automaticas nao aprovadas.

### Fase 5 - Evolucoes opcionais

- preenchimento pelo paciente via link ou QR Code;
- anexos de exames;
- historico longitudinal;
- integracoes clinicas autorizadas;
- indicadores agregados e anonimizados.

## 11. Criterios para iniciar a implementacao

A frente somente devera sair de `Planejado` quando existirem:

- fluxo atual de captacao e agenda estabilizado;
- responsavel clinico definido;
- mapa da rotina real da clinica;
- lista minima de campos aprovada;
- regras de alerta aprovadas por profissional habilitado;
- matriz de permissoes aprovada;
- decisao sobre base legal, retencao e auditoria;
- prototipo validado com recepcao e medico.

## 12. Questoes em aberto

- Quem realiza o pre-atendimento em cada unidade?
- Quais informacoes o medico realmente precisa antes do exame?
- Quais dados podem ser apenas relatados e quais exigem documento?
- Quais condicoes justificam destaque na agenda?
- Quais limites podem gerar alerta sem produzir interpretacao clinica indevida?
- O paciente podera preencher dados pelo proprio celular?
- Por quanto tempo cada resultado sera considerado atual?
- Quem podera corrigir ou remover uma informacao clinica?
- Quais informacoes devem integrar um prontuario e quais permanecem apenas como pre-triagem?

## 13. Referencias iniciais para validacao

- [ADA - Standards of Care in Diabetes 2026](https://diabetesjournals.org/care/article/49/Supplement_1/S261/163919/12-Retinopathy-Neuropathy-and-Foot-Care-Standards)
- [NIDDK - The A1C Test & Diabetes](https://www.niddk.nih.gov/health-information/diagnostic-tests/a1c-test)
- [Ministerio da Saude - PCDT de Retinopatia Diabetica](https://www.gov.br/saude/pt-br/assuntos/pcdt/r/retinopatia-diabetica/view)
- [Ministerio da Saude - LGPD](https://www.gov.br/saude/pt-br/acesso-a-informacao/lgpd)

