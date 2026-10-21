import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/');
});

test('shows only menus allowed for the front desk profile', async ({ page }, testInfo) => {
  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'receptionist'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Nova abordagem/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Meus cadastros/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Agenda de exames/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Retornos da equipe/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Painel de gestao/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Metas/ })).toHaveCount(0);

  const navigation = page.getByRole('navigation', { name: 'Navegacao principal' });
  await expect(navigation.getByRole('button', { name: 'Gestao' })).toHaveCount(0);
  await expect(navigation.getByRole('button', { name: 'Retornos' })).toHaveCount(0);

  await page.getByRole('button', { name: /Agenda de exames/ }).click();
  await expect(page.getByRole('heading', { name: 'Agenda de exames' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo agendamento' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voltar ao inicio' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('receptionist-permitted-menus.png'), fullPage: true });

  await page.goto('/#/management');
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  await expect(page.getByText('Seu perfil nao possui acesso aos dados gerenciais.')).toHaveCount(0);
});

test('captures and lists a lead in development mode', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { name: 'FascinLead' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('home.png'),
    fullPage: true
  });

  await page.getByRole('button', { name: /Nova abordagem/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Cadastro' })).toBeVisible();

  await page.getByLabel('Nome *').fill('Cliente Exemplo');
  await page.getByLabel('Telefone ou WhatsApp *').fill('81999991234');
  await page.getByLabel('CPF', { exact: true }).fill('52998224725');
  await expect(page.getByLabel('CPF', { exact: true })).toHaveValue('529.982.247-25');
  await page.getByLabel('Data de nascimento').fill('1985-04-12');
  await expect(page.locator('[data-birth-age]')).toHaveText(/\d+ anos/);
  await page.getByLabel('Sexo').selectOption('female');
  await page.getByLabel('Rua', { exact: true }).fill('Rua das Flores');
  await page.getByLabel('Numero', { exact: true }).fill('SN');
  await page.getByLabel('Interesse principal').selectOption('complete-glasses');
  await expect(page.getByRole('group', { name: 'Ametropias' })).toHaveCount(0);
  await page.getByLabel('Glaucoma').check();
  await page.getByLabel('Diabetes').check();
  await page.getByLabel('Data do pre-agendamento').fill('2026-10-02');
  await page.getByLabel('Horario disponivel').selectOption('14:20');
  await page.screenshot({
    path: testInfo.outputPath('new-lead.png'),
    fullPage: true
  });

  await page.getByRole('button', { name: 'Salvar cadastro' }).click();

  await expect(page.getByRole('heading', { name: 'Meus cadastros' })).toBeVisible();
  await expect(page.getByText('Cliente Exemplo')).toBeVisible();
  await expect(page.getByText('Somente neste navegador', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Ver cadastro de Cliente Exemplo' }).click();
  await expect(page.getByRole('heading', { name: 'Cliente Exemplo', level: 2 })).toBeVisible();
  await expect(page.getByLabel('Data do pre-agendamento')).toHaveValue('2026-10-02');
  await expect(page.getByLabel('Horario')).toHaveValue('14:20');
  await expect(page.getByLabel('CPF', { exact: true })).toHaveValue('529.982.247-25');
  await expect(page.getByLabel('Data de nascimento')).toHaveValue('1985-04-12');
  await expect(page.locator('[data-birth-age]')).toHaveText(/\d+ anos/);
  await expect(page.getByLabel('Sexo')).toHaveValue('female');
  await expect(page.getByLabel('Rua', { exact: true })).toHaveValue('Rua das Flores');
  await expect(page.getByLabel('Numero', { exact: true })).toHaveValue('S/N');
  await expect(page.getByLabel('Miopia')).not.toBeChecked();
  await expect(page.getByLabel('Astigmatismo')).not.toBeChecked();
  await expect(page.getByLabel('Glaucoma')).toBeChecked();
  await expect(page.getByLabel('Diabetes')).toBeChecked();
  const ametropias = page.getByRole('group', { name: 'Ametropias' });
  await ametropias.getByLabel('Nao possui').check();
  await expect(page.getByLabel('Miopia')).not.toBeChecked();
  await expect(page.getByLabel('Astigmatismo')).not.toBeChecked();
  const pathologies = page.getByRole('group', { name: 'Patologias e condicoes de saude' });
  await pathologies.getByLabel('Nao possui').check();
  await expect(page.getByLabel('Glaucoma')).not.toBeChecked();
  await expect(page.getByLabel('Diabetes')).not.toBeChecked();
  await page.screenshot({
    path: testInfo.outputPath('lead-details.png'),
    fullPage: true
  });
  await page.getByLabel('Nome *').fill('Cliente Corrigido');
  await page.getByLabel('Observacao rapida').fill('Prefere contato pela tarde');
  await page.getByRole('button', { name: 'Salvar alteracoes' }).click();

  await expect(page.getByRole('heading', { name: 'Meus cadastros' })).toBeVisible();
  await expect(page.getByText('Cliente Corrigido')).toBeVisible();
});

test('opens the personal goals screen on mobile and desktop', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Metas/ }).click();

  await expect(page.getByRole('heading', { name: 'Metas' })).toBeVisible();
  await expect(page.getByText('Minhas metas')).toBeVisible();
  await expect(page.getByText('Nenhuma meta cadastrada')).toBeVisible();
  const personalOrder = await page.evaluate(() => ({
    goalsTop: document.querySelector('.goals-results').getBoundingClientRect().top,
    metricsTop: document.querySelector('.goal-metrics').getBoundingClientRect().top
  }));
  expect(personalOrder.goalsTop).toBeLessThan(personalOrder.metricsTop);
  await page.screenshot({ path: testInfo.outputPath('goals.png'), fullPage: true });

  await page.locator('.goals-results').evaluate((element) => {
    element.insertAdjacentHTML('beforebegin', `<fieldset class="goal-members field">
      <legend>Colaboradores <span>1 selecionado</span></legend>
      <div class="goal-member-list"><label class="goal-member-option">
        <input type="checkbox" checked />
        <span class="avatar">GB</span>
        <span><strong>Gabriel Barbosa</strong><small>Loja 06</small></span>
      </label></div>
    </fieldset>`);
  });
  await expect(page.locator('.goal-member-option')).toHaveCSS('display', 'grid');
  await expect(page.locator('.goal-member-option > span').last()).toHaveCSS('color', 'rgb(20, 32, 51)');
  await page.locator('.goals-results').evaluate((element) => {
    element.insertAdjacentHTML('beforeend', `<div class="goal-person">
      <span class="avatar">GG</span>
      <div><strong>Gabriel Gomes Barbosa</strong><span>Loja 02</span></div>
    </div>`);
  });
  await expect(page.locator('.goal-person .avatar')).toHaveCSS('display', 'grid');
  await expect(page.locator('.goal-person .avatar')).toHaveCSS('align-items', 'center');
  await expect(page.locator('.goal-person .avatar')).toHaveCSS('justify-items', 'center');
  await page.screenshot({ path: testInfo.outputPath('goals-member-layout.png'), fullPage: true });
});

test('configures multiple permitted stores for a manager access', async ({ page }, testInfo) => {
  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'admin'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Acessos da equipe/ }).click();

  await page.getByRole('button', { name: 'Novo acesso' }).click();
  await expect(page.getByRole('dialog', { name: 'Novo acesso' })).toBeVisible();
  await expect(page.getByLabel('Nome')).toBeVisible();
  await expect(page.getByLabel('E-mail')).toBeVisible();
  await expect(page.getByLabel('Senha inicial')).toBeVisible();
  await expect(page.getByLabel('Telefone')).toBeVisible();
  await expect(page.getByLabel('Codigo SavWin')).toBeVisible();
  await page.getByLabel('Perfil / cargo').selectOption('system-manager');
  await expect(page.getByText('Unidades permitidas', { exact: true })).toBeVisible();
  await page.getByLabel('Loja 02').check();
  await page.getByLabel('Loja 06').check();
  await expect(page.getByLabel('Loja 02')).toBeChecked();
  await expect(page.getByLabel('Loja 06')).toBeChecked();
  await expect(page.getByLabel('Loja 02').locator('..')).toHaveCSS('color', 'rgb(0, 48, 112)');
  await expect(page.getByLabel('Loja 04').locator('..')).toHaveCSS('color', 'rgb(20, 32, 51)');
  await page.screenshot({ path: testInfo.outputPath('access-store-picker.png'), fullPage: true });
});

test('keeps management actions and filters organized at intermediate widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Uses a controlled intermediate desktop viewport.');
  await page.setViewportSize({ width: 1120, height: 820 });
  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'admin'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Painel de gestao/ }).click();
  await expect(page.getByRole('heading', { name: 'Painel de leads' })).toBeVisible();
  await page.getByLabel('Nome ou telefone').pressSequentially('pedro');
  await expect(page.getByLabel('Nome ou telefone')).toHaveValue('pedro');

  const layout = await page.evaluate(() => {
    const heading = document.querySelector('.management-dashboard-heading').getBoundingClientRect();
    const actions = document.querySelector('.management-heading-actions').getBoundingClientRect();
    const filter = document.querySelector('.management-filters').getBoundingClientRect();
    const search = document.querySelector('.management-search-field').getBoundingClientRect();
    const filterButton = document.querySelector('.management-filter-button').getBoundingClientRect();
    const actionButtons = [...document.querySelectorAll('.management-heading-actions .button')]
      .map((button) => button.getBoundingClientRect());
    const metricCards = [...document.querySelectorAll('.management-metrics > div')]
      .map((card) => {
        const cardRect = card.getBoundingClientRect();
        const labelRect = card.querySelector('span').getBoundingClientRect();
        const valueRect = card.querySelector('strong').getBoundingClientRect();
        const iconRect = card.querySelector('svg').getBoundingClientRect();
        const contentCenter = (labelRect.top + valueRect.bottom) / 2;
        return {
          cardCenter: cardRect.top + cardRect.height / 2,
          contentCenter,
          iconCenter: iconRect.top + iconRect.height / 2
        };
      });
    return {
      headingRight: heading.right,
      actionsTop: actions.top,
      headingTop: heading.top,
      filterRight: filter.right,
      searchWidth: search.width,
      filterButtonWidth: filterButton.width,
      actionButtonsRight: Math.max(...actionButtons.map((button) => button.right)),
      actionRows: new Set(actionButtons.map((button) => Math.round(button.top))).size,
      metricCards
    };
  });

  expect(layout.actionsTop).toBeGreaterThanOrEqual(layout.headingTop);
  expect(layout.actionButtonsRight).toBeLessThanOrEqual(layout.headingRight + 1);
  expect(layout.actionRows).toBe(2);
  expect(layout.searchWidth).toBeGreaterThan(layout.filterButtonWidth * 2);
  expect(layout.filterButtonWidth).toBeGreaterThanOrEqual(160);
  expect(layout.filterRight).toBeLessThanOrEqual(1120);
  for (const metric of layout.metricCards) {
    expect(Math.abs(metric.contentCenter - metric.cardCenter)).toBeLessThanOrEqual(2);
    expect(Math.abs(metric.iconCenter - metric.contentCenter)).toBeLessThanOrEqual(2);
  }
  await page.screenshot({ path: testInfo.outputPath('management-responsive.png'), fullPage: true });
});

test('shows management reports and dashboard grouped by store and captor', async ({ page }, testInfo) => {
  const capturedAtClient = new Date().toISOString();
  let savwinRequest = null;
  await page.route('**/api/savwin/products-by-os', async (route) => {
    savwinRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, count: 4, osCount: 2, records: [] })
    });
  });
  await page.evaluate(({ capturedAtClient }) => {
    sessionStorage.setItem('fascinlead:demo-role', 'admin');
    localStorage.setItem('fascinlead:demo-leads', JSON.stringify([
      {
        id: 'report-attended',
        fullName: 'Cliente Presente',
        phoneSearch: '81999991111',
        capturedAtClient,
        capturedByUid: 'captor-06',
        capturedByName: 'Captador Loja 06',
        storeId: 'loja-06',
        appointmentDate: capturedAtClient.slice(0, 10),
        appointmentTime: '08:00',
        appointmentAttendance: 'attended',
        syncState: 'demo'
      },
      {
        id: 'report-missed',
        fullName: 'Cliente Ausente',
        phoneSearch: '81999992222',
        capturedAtClient,
        capturedByUid: 'captor-06',
        capturedByName: 'Captador Loja 06',
        storeId: 'loja-06',
        appointmentDate: capturedAtClient.slice(0, 10),
        appointmentTime: '09:00',
        appointmentAttendance: 'missed',
        syncState: 'demo'
      },
      {
        id: 'report-unscheduled',
        fullName: 'Cliente Sem Agenda',
        phoneSearch: '81999993333',
        capturedAtClient,
        capturedByUid: 'captor-02',
        capturedByName: 'Captador Loja 02',
        storeId: 'loja-02',
        appointmentDate: '',
        appointmentTime: '',
        appointmentAttendance: 'pending',
        syncState: 'demo'
      }
    ]));
  }, { capturedAtClient });

  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Painel de gestao/ }).click();
  await expect(page.getByRole('button', { name: 'Relatorios' })).toBeVisible();
  await page.getByRole('button', { name: 'Relatorios' }).click();

  await expect(page.getByRole('heading', { name: 'Relatorios' })).toBeVisible();
  const metrics = page.getByRole('region', { name: 'Indicadores do periodo' });
  await expect(metrics.locator('div', { hasText: 'Cadastros' }).locator('strong')).toHaveText('3');
  await expect(metrics.locator('div', { hasText: 'Agendamentos' }).locator('strong')).toHaveText('2');
  await expect(metrics.locator('div', { hasText: 'Comparecimentos' }).locator('strong')).toHaveText('1');
  await expect(metrics.locator('div', { hasText: 'Taxa de comparecimento' }).locator('strong')).toHaveText('50%');
  await expect(page.getByRole('heading', { name: 'Resultados por unidade' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resultados por captador' })).toBeVisible();
  await expect(page.getByText('Loja 02', { exact: true })).toBeVisible();
  await expect(page.getByText('Loja 06', { exact: true })).toBeVisible();
  await expect(page.getByText('Captador Loja 06', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('reports.png'), fullPage: true });

  await page.getByRole('button', { name: 'Voltar para gestao' }).click();
  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  const dashboardMetrics = page.getByRole('region', { name: 'Indicadores do dashboard' });
  await expect(dashboardMetrics.locator(':scope > div > strong')).toHaveText(['3', '2', '1', '2']);
  await expect(page.getByRole('heading', { name: 'Cadastros por dia' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Situacao dos agendamentos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Desempenho por loja' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ranking de captadores' })).toBeVisible();
  await expect(page.getByText('50% dos agendamentos')).toHaveCount(2);
  const reportDate = capturedAtClient.slice(0, 10);
  await page.getByLabel('Data inicial').fill(reportDate);
  await page.getByLabel('Data final').fill(reportDate);
  await page.getByRole('button', { name: 'Aplicar periodo' }).click();
  await expect(page.getByLabel('Data inicial')).toHaveValue(reportDate);
  await expect(page.getByLabel('Data final')).toHaveValue(reportDate);
  await expect(dashboardMetrics.locator(':scope > div > strong')).toHaveText(['3', '2', '1', '2']);
  await page.getByRole('button', { name: 'Consultar SavWin' }).click();
  await expect(page.getByText('SavWin conectado localmente')).toBeVisible();
  await expect(page.getByText('4 item(ns) encontrados em 2 OS no periodo.')).toBeVisible();
  expect(savwinRequest.storeCodes).toEqual(['2', '4', '5', '6']);
  expect(savwinRequest.startDate).toBe(reportDate);
  expect(savwinRequest.endDate).toBe(reportDate);
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
});

test('groups appointments by day and registers attendance', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00-03:00'));
  await page.reload();
  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'admin'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Agenda de exames/ }).click();
  await expect(page.getByText('Nenhum exame neste dia')).toBeVisible();

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const appointmentDate = `${now.getFullYear()}-${month}-18`;
  const nextDate = `${now.getFullYear()}-${month}-19`;

  async function createAppointment(name, date, time) {
    await page.getByRole('button', { name: 'Novo', exact: true }).click();
    await page.getByLabel('Nome *').fill(name);
    await page.getByLabel('Telefone ou WhatsApp *').fill('81999991234');
    await page.getByLabel('Data do pre-agendamento').fill(date);
    await page.getByLabel('Horario disponivel').selectOption(time);
    await page.getByRole('button', { name: 'Salvar cadastro' }).click();
    await expect(page.getByRole('heading', { name: 'Meus cadastros' })).toBeVisible();
  }

  await createAppointment('Cliente Agenda A', appointmentDate, '08:20');
  await createAppointment('Cliente Agenda B', appointmentDate, '10:00');
  await createAppointment('Cliente Outro Dia', nextDate, '09:00');

  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: /Agenda de exames/ }).click();
  const selectedDay = page.locator(`[data-appointment-date="${appointmentDate}"]`);
  await expect(selectedDay).toContainText('2 exames');
  await selectedDay.click();
  await expect(page.getByText('Cliente Agenda A', { exact: true })).toBeVisible();
  await expect(page.getByText('Cliente Agenda B', { exact: true })).toBeVisible();
  await expect(page.getByText('Cliente Outro Dia', { exact: true })).not.toBeVisible();

  await page.getByRole('button', { name: 'Novo agendamento' }).click();
  const appointmentDialog = page.getByRole('dialog', { name: 'Novo agendamento' });
  await expect(appointmentDialog).toBeVisible();
  await expect(appointmentDialog.getByLabel('Horario disponivel').locator('option[value="08:20"]')).toHaveCount(0);
  await appointmentDialog.getByLabel('Nome *').fill('Cliente Direto Agenda');
  await appointmentDialog.getByLabel('Telefone ou WhatsApp *').fill('81988887777');
  await appointmentDialog.getByLabel('Horario disponivel').selectOption('08:40');
  await page.screenshot({ path: testInfo.outputPath('appointment-create-modal.png'), fullPage: true });
  await appointmentDialog.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(appointmentDialog).not.toBeVisible();
  await expect(selectedDay).toContainText('3 exames');
  await expect(page.getByText('Cliente Direto Agenda', { exact: true })).toBeVisible();

  const attendance = page.getByRole('group', { name: 'Comparecimento de Cliente Agenda A' });
  await attendance.getByRole('button', { name: 'Compareceu', exact: true }).click();
  await expect(attendance.getByRole('button', { name: 'Compareceu', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Comparecimento registrado.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('appointments-attendance.png'), fullPage: true });

  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: /Agenda de exames/ }).click();
  await page.locator(`[data-appointment-date="${appointmentDate}"]`).click();
  const persistedAttendance = page.getByRole('group', { name: 'Comparecimento de Cliente Agenda A' });
  await expect(persistedAttendance.getByRole('button', { name: 'Compareceu', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('keeps a long appointment list inside the calendar height', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Desktop sidebar uses its own scroll area.');

  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'admin'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const appointmentDate = `${now.getFullYear()}-${month}-18`;
  await page.evaluate(({ appointmentDate }) => {
    const leads = Array.from({ length: 14 }, (_, index) => ({
      id: `appointment-scroll-${index}`,
      fullName: `Cliente Agenda ${index + 1}`,
      preferredName: '',
      phoneSearch: `8199999${String(index).padStart(4, '0')}`,
      appointmentDate,
      appointmentTime: `${String(8 + Math.floor(index / 3)).padStart(2, '0')}:${String((index % 3) * 20).padStart(2, '0')}`,
      appointmentAttendance: 'pending',
      capturedByName: 'Gestor de Teste',
      capturedByUid: 'demo-admin',
      storeId: 'loja-06',
      syncState: 'demo'
    }));
    localStorage.setItem('fascinlead:demo-leads', JSON.stringify(leads));
    window.dispatchEvent(new Event('fascinlead:demo-leads'));
  }, { appointmentDate });

  await page.getByRole('button', { name: /Agenda de exames/ }).click();
  await page.locator(`[data-appointment-date="${appointmentDate}"]`).click();
  await expect(page.locator('.appointment-item')).toHaveCount(14);

  const layout = await page.evaluate(() => {
    const calendar = document.querySelector('.calendar-panel').getBoundingClientRect();
    const sidebar = document.querySelector('.agenda-sidebar').getBoundingClientRect();
    const details = document.querySelector('.agenda-day-details').getBoundingClientRect();
    const list = document.querySelector('.appointment-list');
    return {
      calendarHeight: calendar.height,
      calendarBottom: calendar.bottom,
      sidebarHeight: sidebar.height,
      detailsBottom: details.bottom,
      listClientHeight: list.clientHeight,
      listScrollHeight: list.scrollHeight,
      listOverflowY: getComputedStyle(list).overflowY
    };
  });

  expect(Math.abs(layout.sidebarHeight - layout.calendarHeight)).toBeLessThanOrEqual(2);
  expect(layout.detailsBottom).toBeLessThanOrEqual(layout.calendarBottom + 2);
  expect(layout.listScrollHeight).toBeGreaterThan(layout.listClientHeight);
  expect(layout.listOverflowY).toBe('auto');
  await page.screenshot({ path: testInfo.outputPath('appointments-scroll.png'), fullPage: true });
});

test('keeps new registration beside the management return action', async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === 'desktop-chrome'
    ? { width: 1024, height: 720 }
    : { width: 390, height: 844 });
  const now = new Date();
  const appointmentDate = now.toISOString().slice(0, 10);
  await page.evaluate(({ date }) => {
    sessionStorage.setItem('fascinlead:demo-role', 'admin');
    localStorage.setItem('fascinlead:demo-leads', JSON.stringify([{
      id: 'lead-sale-test',
      fullName: 'Cliente Venda',
      phone: '+5581999991234',
      phoneSearch: '81999991234',
      appointmentDate: date,
      appointmentTime: '10:00',
      appointmentAttendance: 'attended',
      capturedAtClient: `${date}T09:00:00.000Z`,
      capturedByUid: 'demo-admin',
      capturedByName: 'ADM',
      storeId: 'loja-06',
      source: 'street',
      schemaVersion: 1,
      syncState: 'demo'
    }]));
  }, { date: appointmentDate });
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Agenda de exames/ }).click();
  await page.locator(`[data-appointment-date="${appointmentDate}"]`).click();
  const heading = page.locator('.agenda-heading');
  await expect(heading.getByRole('button', { name: 'Voltar para gestao' })).toBeVisible();
  await expect(heading.getByRole('button', { name: 'Novo agendamento' })).toBeVisible();
  await expect(page.locator('.agenda-day-heading').getByRole('button', { name: 'Novo agendamento' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Informar CPF|Atualizar CPF/ })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('appointment-header-actions.png'), fullPage: true });
  await heading.getByRole('button', { name: 'Novo agendamento' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo agendamento' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Salvar cadastro' })).toBeVisible();
  await expect(dialog.getByText('Informacoes adicionais')).toHaveCount(0);
  await expect(dialog.getByLabel('CPF', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Data de nascimento')).toBeVisible();
  await expect(dialog.getByLabel('Sexo')).toBeVisible();
  const fieldOrder = await dialog.locator('input, select, textarea').evaluateAll((controls) => {
    const tracked = new Set([
      'fullName', 'phone', 'customerCpf', 'birthDate', 'sex', 'preferredName',
      'street', 'streetNumber', 'neighborhood', 'city', 'state', 'interestId',
      'storeId', 'appointmentServiceId', 'ametropiaIds', 'pathologyIds',
      'appointmentDate', 'appointmentTime', 'notes'
    ]);
    const seen = new Set();
    return controls.reduce((order, control) => {
      const name = control.name || (control.id === 'agenda-lead-date' ? 'appointmentDate' : '');
      if (tracked.has(name) && !seen.has(name)) {
        seen.add(name);
        order.push(name);
      }
      return order;
    }, []);
  });
  expect(fieldOrder).toEqual([
    'fullName', 'phone', 'customerCpf', 'birthDate', 'sex', 'preferredName',
    'street', 'streetNumber', 'neighborhood', 'city', 'state', 'interestId',
    'storeId', 'appointmentServiceId', 'pathologyIds', 'appointmentDate',
    'appointmentTime', 'notes'
  ]);
  await dialog.getByLabel('Nome *').fill('Cliente preservado');
  await dialog.getByLabel('Loja').selectOption('loja-02');
  await expect(dialog.getByLabel('Nome *')).toHaveValue('Cliente preservado');
  const identityLayout = await dialog.evaluate((element) => {
    const cpf = element.querySelector('[data-field="customerCpf"]').getBoundingClientRect();
    const birthDate = element.querySelector('[data-field="birthDate"]').getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      cpfTop: cpf.top,
      cpfBottom: cpf.bottom,
      cpfRight: cpf.right,
      birthTop: birthDate.top,
      birthLeft: birthDate.left
    };
  });
  if (identityLayout.viewportWidth > 640) {
    expect(Math.abs(identityLayout.cpfTop - identityLayout.birthTop)).toBeLessThanOrEqual(2);
    expect(identityLayout.birthLeft).toBeGreaterThanOrEqual(identityLayout.cpfRight);
  } else {
    expect(identityLayout.birthTop).toBeGreaterThanOrEqual(identityLayout.cpfBottom);
  }
  const modalLayout = await dialog.evaluate((element) => {
    const dialogRect = element.getBoundingClientRect();
    const actionsRect = element.querySelector('.appointment-create-actions').getBoundingClientRect();
    const saveRect = element.querySelector('button[type="submit"]').getBoundingClientRect();
    const content = element.querySelector('.appointment-create-content');
    return {
      dialogBottom: dialogRect.bottom,
      actionsBottom: actionsRect.bottom,
      saveBottom: saveRect.bottom,
      saveHeight: saveRect.height,
      contentClientHeight: content.clientHeight,
      contentScrollHeight: content.scrollHeight,
      contentOverflowY: getComputedStyle(content).overflowY
    };
  });
  expect(modalLayout.actionsBottom).toBeLessThanOrEqual(modalLayout.dialogBottom + 1);
  expect(modalLayout.saveBottom).toBeLessThanOrEqual(modalLayout.dialogBottom + 1);
  expect(modalLayout.saveHeight).toBeGreaterThanOrEqual(40);
  expect(modalLayout.contentOverflowY).toBe('auto');
  expect(modalLayout.contentScrollHeight).toBeGreaterThan(modalLayout.contentClientHeight);
  await dialog.screenshot({ path: testInfo.outputPath('appointment-create-dialog.png') });
  await dialog.getByLabel('CPF', { exact: true }).scrollIntoViewIfNeeded();
  await dialog.screenshot({ path: testInfo.outputPath('appointment-create-identity.png') });
});

test('alerts the captor about a missed appointment and prepares WhatsApp follow-up', async ({ page }, testInfo) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const missedDate = yesterday.toISOString().slice(0, 10);
  const futureDate = tomorrow.toISOString().slice(0, 10);

  await page.evaluate(({ missedDate, futureDate }) => {
    localStorage.setItem('fascinlead:demo-leads', JSON.stringify([
      {
        id: 'missed-owned-lead',
        fullName: 'Cliente Retorno',
        preferredName: 'Clara',
        phone: '+5581999991234',
        phoneSearch: '81999991234',
        appointmentDate: missedDate,
        appointmentTime: '08:00',
        appointmentAttendance: 'missed',
        appointmentSchedulingMode: 'controlled',
        appointmentDurationMinutes: 20,
        capturedByUid: 'demo-user',
        capturedByName: 'Equipe Fascinante',
        capturedAtClient: new Date().toISOString(),
        storeId: 'loja-teste',
        notes: '',
        syncState: 'demo'
      },
      {
        id: 'future-missed-lead',
        fullName: 'Cliente Futuro',
        phone: '+5581999999999',
        phoneSearch: '81999999999',
        appointmentDate: futureDate,
        appointmentTime: '08:00',
        appointmentAttendance: 'missed',
        capturedByUid: 'demo-user',
        capturedByName: 'Equipe Fascinante',
        storeId: 'loja-teste',
        notes: '',
        syncState: 'demo'
      }
    ]));
  }, { missedDate, futureDate });

  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await expect(page.getByRole('button', { name: /Retornos pendentes/ })).toContainText('1 cliente');
  await page.getByRole('button', { name: /Retornos pendentes/ }).click();
  await expect(page.getByRole('heading', { name: 'Retornos pendentes' })).toBeVisible();
  await expect(page.getByText('Cliente Retorno', { exact: true })).toBeVisible();
  await expect(page.getByText('Cliente Futuro', { exact: true })).not.toBeVisible();

  const whatsAppLink = page.getByRole('link', { name: 'Chamar no WhatsApp' });
  await expect(whatsAppLink).toHaveAttribute('href', /wa\.me\/5581999991234/);
  await expect(whatsAppLink).toHaveAttribute('href', /reagendar/);
  await whatsAppLink.evaluate((element) => {
    element.addEventListener('click', (event) => event.preventDefault(), { once: true });
    element.click();
  });
  await expect(page.getByText('Contato iniciado', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('missed-follow-up.png'), fullPage: true });

  await page.getByRole('button', { name: 'Reagendar' }).click();
  await page.getByLabel('Data do pre-agendamento').fill(futureDate);
  await page.getByLabel('Horario').fill('10:00');
  await page.getByRole('button', { name: 'Salvar alteracoes' }).click();
  await page.getByRole('button', { name: 'Retornos', exact: true }).click();
  await expect(page.getByText('Nenhum retorno pendente')).toBeVisible();
});

test('lets a manager monitor follow-ups grouped by collaborator', async ({ page }, testInfo) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const appointmentDate = yesterday.toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const rescheduleDate = tomorrow.toISOString().slice(0, 10);

  await page.evaluate(({ appointmentDate }) => {
    sessionStorage.setItem('fascinlead:demo-role', 'manager');
    localStorage.setItem('fascinlead:demo-leads', JSON.stringify([
      {
        id: 'team-awaiting',
        fullName: 'Cliente Aguardando',
        phone: '+5581999991111',
        phoneSearch: '81999991111',
        appointmentDate,
        appointmentTime: '08:00',
        appointmentAttendance: 'missed',
        capturedByUid: 'captor-ana',
        capturedByName: 'Ana Captadora',
        capturedAtClient: new Date().toISOString(),
        storeId: 'loja-06',
        notes: '',
        syncState: 'demo'
      },
      {
        id: 'team-contacted',
        fullName: 'Cliente Contatado',
        phone: '+5581999992222',
        phoneSearch: '81999992222',
        appointmentDate,
        appointmentTime: '09:00',
        appointmentAttendance: 'missed',
        followUpContactedAt: new Date().toISOString(),
        followUpContactedByUid: 'captor-bruno',
        followUpContactedByName: 'Bruno Captador',
        followUpContactedAppointmentKey: `${appointmentDate}|09:00`,
        capturedByUid: 'captor-bruno',
        capturedByName: 'Bruno Captador',
        capturedAtClient: new Date().toISOString(),
        storeId: 'loja-06',
        notes: '',
        syncState: 'demo'
      },
      {
        id: 'another-store',
        fullName: 'Cliente Outra Loja',
        phone: '+5581999993333',
        phoneSearch: '81999993333',
        appointmentDate,
        appointmentTime: '10:00',
        appointmentAttendance: 'missed',
        capturedByUid: 'captor-outra',
        capturedByName: 'Outra Captadora',
        storeId: 'loja-04',
        notes: '',
        syncState: 'demo'
      }
    ]));
  }, { appointmentDate });

  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Retornos da equipe/ }).click();

  await expect(page.getByRole('heading', { name: 'Retornos da equipe' })).toBeVisible();
  await expect(page.locator('.follow-up-team-heading').getByText('Ana Captadora', { exact: true })).toBeVisible();
  await expect(page.locator('.follow-up-team-heading').getByText('Bruno Captador', { exact: true })).toBeVisible();
  await expect(page.locator('.follow-up-team-heading .avatar').first()).toHaveCSS('display', 'grid');
  await expect(page.locator('.follow-up-team-heading .avatar').first()).toHaveCSS('place-items', 'center');
  await expect(page.getByText('Outra Captadora', { exact: true })).not.toBeVisible();
  await expect(page.locator('.status-badge', { hasText: 'Aguardando contato' })).toBeVisible();
  await expect(page.locator('.status-badge', { hasText: 'Contato iniciado' })).toBeVisible();
  await page.locator('[data-follow-up-filter="contacted"]').click();
  await expect(page.getByText('Cliente Contatado', { exact: true })).toBeVisible();
  await expect(page.getByText('Cliente Aguardando', { exact: true })).not.toBeVisible();
  await page.locator('[data-follow-up-filter="waiting"]').click();
  await expect(page.getByText('Cliente Aguardando', { exact: true })).toBeVisible();
  await expect(page.getByText('Cliente Contatado', { exact: true })).not.toBeVisible();
  await page.locator('[data-follow-up-filter="all"]').click();
  const awaitingCard = page.locator('.follow-up-item').filter({ hasText: 'Cliente Aguardando' });
  const whatsAppLink = awaitingCard.getByRole('link', { name: 'Chamar no WhatsApp' });
  await expect(whatsAppLink).toHaveAttribute('href', /wa\.me\/5581999991111/);
  await whatsAppLink.evaluate((element) => {
    element.addEventListener('click', (event) => event.preventDefault(), { once: true });
    element.click();
  });
  await expect(awaitingCard.getByText('Contato iniciado', { exact: true })).toBeVisible();
  await expect(awaitingCard.getByText('Gestor de Teste', { exact: true })).toBeVisible();
  await page.locator('[data-follow-up-filter="contacted"]').click();
  await expect(page.getByText('Cliente Aguardando', { exact: true })).toBeVisible();
  await expect(page.getByText('Cliente Contatado', { exact: true })).toBeVisible();
  await page.locator('[data-follow-up-filter="captors"]').click();
  await expect(page.locator('.follow-up-captor-card')).toHaveCount(2);
  await page.locator('[data-follow-up-filter="all"]').click();
  await page.screenshot({ path: testInfo.outputPath('manager-team-follow-ups.png'), fullPage: true });
  await awaitingCard.getByRole('button', { name: 'Reagendar' }).click();
  await expect(page.getByRole('heading', { name: 'Cliente Aguardando' })).toBeVisible();
  await expect(page.getByLabel('Nome *')).toBeDisabled();
  await expect(page.getByLabel('Data do pre-agendamento')).toBeEnabled();
  await page.getByLabel('Data do pre-agendamento').fill(rescheduleDate);
  await page.getByLabel('Horario').fill('10:30');
  await page.getByRole('button', { name: 'Salvar reagendamento' }).click();
  await expect(page.getByText('Lead atualizado com sucesso.')).toBeVisible();
});

test('lets an administrator monitor follow-ups from every store', async ({ page }, testInfo) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const appointmentDate = yesterday.toISOString().slice(0, 10);

  await page.evaluate(({ appointmentDate }) => {
    sessionStorage.setItem('fascinlead:demo-role', 'admin');
    localStorage.setItem('fascinlead:demo-leads', JSON.stringify([
      {
        id: 'admin-store-02',
        fullName: 'Cliente Loja 02',
        phone: '+5581999991111',
        phoneSearch: '81999991111',
        appointmentDate,
        appointmentTime: '08:00',
        appointmentAttendance: 'missed',
        capturedByUid: 'captor-02',
        capturedByName: 'Captador Loja 02',
        storeId: 'loja-02',
        notes: '',
        syncState: 'demo'
      },
      {
        id: 'admin-store-06',
        fullName: 'Cliente Loja 06',
        phone: '+5581999992222',
        phoneSearch: '81999992222',
        appointmentDate,
        appointmentTime: '09:00',
        appointmentAttendance: 'missed',
        capturedByUid: 'captor-06',
        capturedByName: 'Captador Loja 06',
        storeId: 'loja-06',
        notes: '',
        syncState: 'demo'
      }
    ]));
  }, { appointmentDate });

  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Retornos da equipe/ }).click();

  await expect(page.getByRole('heading', { name: 'Retornos da equipe' })).toBeVisible();
  const store02Card = page.locator('.follow-up-item').filter({ hasText: 'Cliente Loja 02' });
  const store06Card = page.locator('.follow-up-item').filter({ hasText: 'Cliente Loja 06' });
  await expect(store02Card.getByText('Loja 02', { exact: true })).toBeVisible();
  await expect(store06Card.getByText('Loja 06', { exact: true })).toBeVisible();
  await expect(store02Card.getByRole('link', { name: 'Chamar no WhatsApp' })).toBeVisible();
  await expect(store02Card.getByRole('button', { name: 'Reagendar' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('admin-all-store-follow-ups.png'), fullPage: true });
});

test('configures the schedule and hides occupied slots', async ({ page }, testInfo) => {
  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'admin'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Configuracoes/ }).click();
  await expect(page.getByRole('heading', { name: 'Configuracoes' })).toBeVisible();
  await expect(page.getByText('Configuracoes da agenda', { exact: true })).toBeVisible();

  await page.getByLabel('Loja').selectOption('loja-06');
  await expect(page.getByLabel('Exibir ametropias no cadastro')).not.toBeChecked();
  await page.getByLabel('Exibir ametropias no cadastro').check();
  await expect(page.getByLabel('Exibir ametropias no cadastro')).toBeChecked();
  const graceInput = page.getByLabel('Tolerancia apos o horario');
  await graceInput.fill('45');
  const graceLayout = await page.evaluate(() => {
    const help = document.querySelector('#settings-no-show-help').getBoundingClientRect();
    const input = document.querySelector('#settings-no-show-grace').getBoundingClientRect();
    return { helpBottom: help.bottom, inputTop: input.top };
  });
  expect(graceLayout.helpBottom).toBeLessThanOrEqual(graceLayout.inputTop);
  await page.getByLabel('Gerar retorno automaticamente').check();
  await expect(page.getByLabel('Gerar retorno automaticamente')).toBeChecked();
  await page.getByLabel('Inicio').fill('08:00');
  await page.getByLabel('Fim').fill('18:00');
  await page.getByRole('button', { name: 'Salvar configuracao' }).click();
  await expect(page.getByText('Configuracao da agenda salva.')).toBeVisible();
  await expect(page.getByText('45 min')).toBeVisible();
  await expect(page.getByText('Ativo', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('schedule-settings.png'), fullPage: true });

  await page.getByRole('button', { name: 'Novo', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Ametropias' })).toBeVisible();
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const appointmentDate = date.toISOString().slice(0, 10);
  await page.getByLabel('Data do pre-agendamento').fill(appointmentDate);
  const timeSelect = page.getByLabel('Horario disponivel');
  await expect(timeSelect.locator('option[value="08:00"]')).toHaveCount(1);
  await expect(timeSelect.locator('option[value="08:20"]')).toHaveCount(1);
  await expect(timeSelect.locator('option[value="08:30"]')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('available-slots.png'), fullPage: true });

  await page.getByLabel('Nome *').fill('Cliente Horario Ocupado');
  await page.getByLabel('Telefone ou WhatsApp *').fill('81999991234');
  await timeSelect.selectOption('08:00');
  await page.getByRole('button', { name: 'Salvar cadastro' }).click();
  await page.getByRole('button', { name: 'Novo', exact: true }).click();
  await page.getByLabel('Data do pre-agendamento').fill(appointmentDate);
  await expect(page.getByLabel('Horario disponivel').locator('option[value="08:00"]')).toHaveCount(0);
});

test('shows the role and permission editor on desktop and mobile', async ({ page }, testInfo) => {
  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'admin'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Configuracoes/ }).click();
  await page.getByRole('tab', { name: 'Perfis e permissoes' }).click();

  await expect(page.getByText('Novo perfil', { exact: true })).toBeVisible();
  await expect(page.getByText('Colaborador', { exact: true })).toBeVisible();
  await expect(page.getByText('Gestor de unidades', { exact: true })).toBeVisible();
  await expect(page.getByText('Atendente de balcao', { exact: true })).toBeVisible();
  await expect(page.getByText('Administrador', { exact: true })).toBeVisible();
  await expect(page.getByText('Perfil protegido do sistema')).toHaveCount(4);
  await page.getByRole('button', { name: 'Visualizar permissoes do perfil Atendente de balcao' }).click();
  const receptionistDialog = page.getByRole('dialog', { name: 'Atendente de balcao' });
  await expect(receptionistDialog.locator('.role-details-permission.is-active')).toHaveCount(5);
  await expect(receptionistDialog.getByText('5 de 18 permissoes ativadas')).toBeVisible();
  await receptionistDialog.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: 'Visualizar permissoes do perfil Colaborador' }).click();
  const detailsDialog = page.getByRole('dialog', { name: 'Colaborador' });
  await expect(detailsDialog).toBeVisible();
  await expect(detailsDialog.locator('.role-details-permission')).toHaveCount(18);
  await expect(detailsDialog.locator('.role-details-permission.is-active')).toHaveCount(5);
  await expect(detailsDialog.getByText('5 de 18 permissoes ativadas')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('role-permissions-details.png') });
  await detailsDialog.getByRole('button', { name: 'Concluir' }).click();
  await expect(detailsDialog).not.toBeVisible();
  await expect(page.getByLabel('Cadastrar leads')).toBeChecked();
  await expect(page.getByLabel('Acessar a gestao de leads')).toHaveCount(0);
  await page.getByLabel('Alcance dos dados').selectOption('stores');
  await expect(page.getByLabel('Acessar a gestao de leads')).toBeChecked();
  await page.getByLabel('Nome do perfil').fill('Supervisor de teste');
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  const customCard = page.locator('.role-profile-card').filter({ hasText: 'Supervisor de teste' });
  await expect(customCard).toBeVisible();

  await customCard.getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByText('Editar perfil', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Nome do perfil')).toBeFocused();
  await page.getByLabel('Nome do perfil').fill('Supervisor atualizado');
  await page.getByRole('button', { name: 'Salvar alteracoes' }).click();
  const updatedCard = page.locator('.role-profile-card').filter({ hasText: 'Supervisor atualizado' });
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByTitle('Excluir perfil').click();
  const deleteDialog = page.getByRole('dialog', { name: 'Excluir perfil?' });
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog).toHaveJSProperty('open', true);
  await deleteDialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(deleteDialog).not.toBeVisible();

  await updatedCard.getByTitle('Excluir perfil').click();
  await page.getByRole('dialog', { name: 'Excluir perfil?' }).getByRole('button', { name: 'Excluir perfil' }).click();
  await expect(updatedCard).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('role-profiles-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.role-settings-layout')).toHaveCSS('grid-template-columns', /[0-9.]+px/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('role-profiles-mobile.png'), fullPage: true });
});

test('creates a service and uses its duration in new appointments', async ({ page }, testInfo) => {
  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'admin'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Configuracoes/ }).click();
  await page.getByRole('tab', { name: 'Servicos' }).click();

  await expect(page.getByText('Servicos cadastrados')).toBeVisible();
  await expect(page.getByText('Exame de vista')).toHaveCount(1);
  await page.getByRole('button', { name: 'Novo servico' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo servico' });
  await dialog.getByLabel('Nome do servico').fill('Avaliacao especializada');
  await dialog.getByLabel('Duracao').fill('45');
  await expect(dialog.getByText('Loja 02', { exact: true })).toHaveCSS('color', 'rgb(20, 32, 51)');
  await dialog.getByLabel('Loja 02').uncheck();
  await dialog.getByLabel('Loja 06').check();
  await dialog.getByLabel('Loja 04').check();
  await dialog.getByRole('button', { name: 'Salvar servico' }).click();

  const serviceRow = page.locator('.service-catalog-row').filter({ hasText: 'Avaliacao especializada' });
  await expect(serviceRow).toBeVisible();
  await expect(serviceRow.getByText('45 min')).toBeVisible();
  await expect(serviceRow).toContainText('Loja 04 · Loja 06');
  await page.screenshot({ path: testInfo.outputPath('service-catalog.png'), fullPage: true });

  await page.getByRole('button', { name: 'Novo', exact: true }).click();
  await page.getByLabel('Servico do agendamento').selectOption({ label: 'Avaliacao especializada - 45 min' });
  const date = new Date();
  date.setDate(date.getDate() + 1);
  await page.getByLabel('Data do pre-agendamento').fill(date.toISOString().slice(0, 10));
  const timeSelect = page.getByLabel('Horario disponivel');
  await expect(timeSelect.locator('option[value="08:00"]')).toHaveCount(1);
  await expect(timeSelect.locator('option[value="08:45"]')).toHaveCount(1);
  await expect(timeSelect.locator('option[value="08:20"]')).toHaveCount(0);
});
