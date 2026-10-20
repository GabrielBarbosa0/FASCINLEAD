# Plano de implementacao: servicos da agenda

## Status

Primeira versao implementada e publicada em 20/10/2026. O servico **Exame de vista** foi consolidado em um unico cadastro vinculado as 4 unidades, e os 54 agendamentos existentes foram relinkados. A auditoria posterior nao encontrou registros pendentes.

Pendencias planejadas:

- Incluir o servico em relatorios e exportacoes quando isso for necessario.
- Reforcar a reserva transacional para impedir que duas gravacoes simultaneas, com horarios iniciais diferentes, criem intervalos sobrepostos.
- Remover os fallbacks de compatibilidade depois que todos os ambientes forem migrados e validados.

## Objetivo

Permitir que administradores cadastrem os tipos de atendimento e escolham todas as unidades que oferecem cada servico. Cada servico deve definir sua propria duracao e disponibilidade, e a agenda deve usar essas informacoes para montar os horarios livres.

O primeiro servico padrao sera **Exame de vista**, preservando o fluxo atual sem adicionar complexidade desnecessaria para o captador.

## Problema atual

Atualmente, cada unidade possui uma unica duracao de consulta nas configuracoes da agenda. Isso atende ao exame de vista, mas nao permite que a mesma unidade ofereca atendimentos com duracoes diferentes.

Exemplos futuros:

- Exame de vista: 30 minutos.
- Retorno: 15 minutos.
- Avaliacao especializada: 45 minutos.

## Experiencia proposta

### Configuracoes

Adicionar uma aba **Servicos** dentro da pagina **Configuracoes**, ao lado de **Agenda** e **Perfis e permissoes**.

A tela deve apresentar:

- Botao **Novo servico**.
- Lista de servicos cadastrados.
- Nome do servico.
- Unidades vinculadas.
- Duracao em minutos.
- Status ativo ou inativo.
- Acao para editar.
- Acao para ativar ou desativar.

Evitar exclusao definitiva quando o servico ja tiver sido usado. Nesse caso, permitir apenas a desativacao para preservar o historico.

### Cadastro do servico

Campos:

- Nome, obrigatorio, entre 2 e 80 caracteres.
- Lojas atendidas, com pelo menos uma unidade obrigatoria.
- Duracao, obrigatoria, entre 5 e 180 minutos.
- Status ativo ou inativo.

O modal deve seguir o padrao visual dos modais existentes no FascinLead, sem copiar a interface do Captar.

### Agendamento

Ao criar ou reagendar um atendimento:

1. Selecionar a unidade.
2. Selecionar um servico ativo daquela unidade.
3. Escolher a data.
4. Exibir horarios compativeis com a duracao do servico escolhido.

Quando existir somente um servico ativo na unidade, ele pode ser selecionado automaticamente para manter o fluxo rapido.

## Modelo de dados sugerido

Criar a colecao `appointmentServices`.

```text
appointmentServices/{serviceId}
  name: string
  storeIds: string[]
  durationMinutes: number
  active: boolean
  createdAt: timestamp
  createdBy: string
  updatedAt: timestamp
  updatedBy: string
  schemaVersion: 1
```

Adicionar aos novos leads/agendamentos:

```text
appointmentServiceId: string
appointmentServiceName: string
appointmentDurationMinutes: number
```

O agendamento deve salvar o identificador e tambem uma copia do nome e da duracao. Essa copia protege o historico: alterar um servico no futuro nao pode modificar atendimentos antigos.

## Regras de negocio

- Somente perfis com permissao administrativa podem criar, editar, ativar ou desativar servicos.
- Gestores e colaboradores podem visualizar apenas os servicos ativos das unidades permitidas.
- A unidade do agendamento precisa estar entre as lojas atendidas pelo servico.
- A duracao usada para reservar o horario deve ser a duracao copiada no agendamento.
- Desativar um servico impede novos agendamentos, mas nao afeta os existentes.
- Alterar a duracao vale somente para novos agendamentos.
- Nao permitir dois agendamentos sobrepostos, mesmo quando os servicos tiverem duracoes diferentes.

## Compatibilidade e migracao

1. Criar um unico servico **Exame de vista** e vincular todas as unidades existentes.
2. Usar como duracao inicial o valor atual de `appointmentDurationMinutes`, validando antes da consolidacao se as unidades usam duracoes diferentes.
3. Associar os agendamentos existentes ao servico padrao durante uma migracao controlada.
4. Manter compatibilidade temporaria com registros sem `appointmentServiceId`.
5. Depois da migracao e validacao, remover a duracao unica da configuracao da agenda ou transforma-la apenas em valor padrao para novos servicos.

## Alteracoes tecnicas previstas

- Criar utilitarios para validacao de servicos.
- Criar um servico de acesso ao Firestore para listar e salvar servicos.
- Adicionar regras do Firestore para `appointmentServices`.
- Adicionar a aba **Servicos** em Configuracoes.
- Criar modal de cadastro e edicao.
- Carregar servicos ativos no novo cadastro e no agendamento direto da agenda.
- Atualizar a montagem dos horarios para considerar a duracao selecionada.
- Atualizar a reserva de slots para detectar intervalos sobrepostos.
- Exibir o nome do servico nos detalhes do agendamento.
- Incluir servico em relatorios e exportacoes quando for util.

## Etapas de execucao

### Etapa 1: dados e seguranca

- [x] Definir o formato final da colecao.
- [x] Implementar validacao.
- [x] Implementar leitura e gravacao.
- [x] Criar regras e testes de permissao.

### Etapa 2: configuracoes

- [x] Adicionar a aba **Servicos**.
- [x] Implementar listagem, criacao, edicao e alteracao de status.
- [x] Garantir layout responsivo em celular e desktop.

### Etapa 3: integracao com a agenda

- [x] Adicionar selecao de servico aos fluxos de novo cadastro e agendamento direto.
- [x] Preservar o servico nos fluxos de edicao e reagendamento.
- [x] Calcular disponibilidade pela duracao selecionada.
- [x] Impedir sobreposicoes nos fluxos normais da interface.
- [ ] Reforcar a protecao contra gravacoes concorrentes de intervalos sobrepostos.
- [x] Salvar a copia historica do servico no agendamento.

### Etapa 4: migracao

- [x] Criar script para consolidar o servico padrao e vincular todas as unidades.
- [x] Associar os agendamentos existentes no mesmo script.
- [x] Conferir contagens em modo de simulacao.
- [x] Manter um modo de simulacao antes da gravacao definitiva.
- [x] Aplicar e validar a migracao no ambiente publicado.

### Etapa 5: verificacao

- [x] Testes unitarios das validacoes e do calculo de horarios.
- [x] Testes das regras do Firestore.
- [x] Testes ponta a ponta do cadastro e uso de servicos.
- [x] Testes com servicos de duracoes diferentes no mesmo dia.
- [x] Testes de regressao do cadastro rapido e da agenda existente.
- [x] Verificacao visual em desktop e celular.

## Criterios de conclusao

- O administrador consegue escolher todas as unidades atendidas por cada servico.
- Apenas servicos ativos aparecem em novos agendamentos.
- Horarios respeitam a duracao de cada servico.
- Agendamentos de duracoes diferentes nao se sobrepoem.
- Alteracoes em um servico nao modificam o historico.
- Dados antigos continuam visiveis e funcionais apos a migracao.
- O fluxo com apenas **Exame de vista** permanece tao simples quanto o atual.
