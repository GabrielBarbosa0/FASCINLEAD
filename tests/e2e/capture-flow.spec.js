import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/');
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
  await expect(page.getByRole('heading', { name: 'Pre-cadastro' })).toBeVisible();

  await page.getByLabel('Nome *').fill('Cliente Exemplo');
  await page.getByLabel('Telefone ou WhatsApp *').fill('81999991234');
  await page.getByLabel('Interesse principal').selectOption('complete-glasses');
  await page.getByLabel('Miopia').check();
  await page.getByLabel('Astigmatismo').check();
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
  await expect(page.getByRole('heading', { name: 'Cliente Exemplo' })).toBeVisible();
  await expect(page.getByLabel('Data do pre-agendamento')).toHaveValue('2026-10-02');
  await expect(page.getByLabel('Horario')).toHaveValue('14:20');
  await expect(page.getByLabel('Miopia')).toBeChecked();
  await expect(page.getByLabel('Astigmatismo')).toBeChecked();
  await page.getByLabel('Nao possui').check();
  await expect(page.getByLabel('Miopia')).not.toBeChecked();
  await expect(page.getByLabel('Astigmatismo')).not.toBeChecked();
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

  await page.getByLabel('Perfil').selectOption('manager');
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
    const copy = document.querySelector('.management-heading-copy').getBoundingClientRect();
    const actions = document.querySelector('.management-heading-actions').getBoundingClientRect();
    const filter = document.querySelector('.management-filters').getBoundingClientRect();
    const search = document.querySelector('.management-search-field').getBoundingClientRect();
    const filterButton = document.querySelector('.management-filter-button').getBoundingClientRect();
    const actionButtons = [...document.querySelectorAll('.management-heading-actions .button')]
      .map((button) => button.getBoundingClientRect());
    return {
      headingRight: heading.right,
      copyBottom: copy.bottom,
      actionsTop: actions.top,
      filterRight: filter.right,
      searchWidth: search.width,
      filterButtonWidth: filterButton.width,
      actionButtonsRight: Math.max(...actionButtons.map((button) => button.right)),
      actionRows: new Set(actionButtons.map((button) => Math.round(button.top))).size
    };
  });

  expect(layout.actionsTop).toBeGreaterThanOrEqual(layout.copyBottom);
  expect(layout.actionButtonsRight).toBeLessThanOrEqual(layout.headingRight + 1);
  expect(layout.actionRows).toBe(2);
  expect(layout.searchWidth).toBeGreaterThan(layout.filterButtonWidth * 2);
  expect(layout.filterButtonWidth).toBeGreaterThanOrEqual(160);
  expect(layout.filterRight).toBeLessThanOrEqual(1120);
  await page.screenshot({ path: testInfo.outputPath('management-responsive.png'), fullPage: true });
});

test('groups appointments by day and registers attendance', async ({ page }, testInfo) => {
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
  await expect(page.getByText('Ana Captadora', { exact: true })).toBeVisible();
  await expect(page.getByText('Bruno Captador', { exact: true })).toBeVisible();
  await expect(page.locator('.follow-up-team-heading .avatar').first()).toHaveCSS('display', 'grid');
  await expect(page.locator('.follow-up-team-heading .avatar').first()).toHaveCSS('place-items', 'center');
  await expect(page.getByText('Outra Captadora', { exact: true })).not.toBeVisible();
  await expect(page.locator('.status-badge', { hasText: 'Aguardando contato' })).toBeVisible();
  await expect(page.locator('.status-badge', { hasText: 'Contato iniciado' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chamar no WhatsApp' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('manager-team-follow-ups.png'), fullPage: true });
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
  await page.screenshot({ path: testInfo.outputPath('admin-all-store-follow-ups.png'), fullPage: true });
});

test('configures appointment duration and hides occupied slots', async ({ page }, testInfo) => {
  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'admin'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Configuracoes da agenda/ }).click();
  await expect(page.getByRole('heading', { name: 'Configuracoes da agenda' })).toBeVisible();

  await page.getByLabel('Loja').selectOption('loja-06');
  await page.getByLabel('Duracao da consulta').fill('30');
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
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const appointmentDate = date.toISOString().slice(0, 10);
  await page.getByLabel('Data do pre-agendamento').fill(appointmentDate);
  const timeSelect = page.getByLabel('Horario disponivel');
  await expect(timeSelect.locator('option[value="08:00"]')).toHaveCount(1);
  await expect(timeSelect.locator('option[value="08:30"]')).toHaveCount(1);
  await expect(timeSelect.locator('option[value="08:20"]')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('available-slots.png'), fullPage: true });

  await page.getByLabel('Nome *').fill('Cliente Horario Ocupado');
  await page.getByLabel('Telefone ou WhatsApp *').fill('81999991234');
  await timeSelect.selectOption('08:00');
  await page.getByRole('button', { name: 'Salvar cadastro' }).click();
  await page.getByRole('button', { name: 'Novo', exact: true }).click();
  await page.getByLabel('Data do pre-agendamento').fill(appointmentDate);
  await expect(page.getByLabel('Horario disponivel').locator('option[value="08:00"]')).toHaveCount(0);
});
