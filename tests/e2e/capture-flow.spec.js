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
  await page.screenshot({ path: testInfo.outputPath('goals-member-layout.png'), fullPage: true });
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

test('configures appointment duration and hides occupied slots', async ({ page }, testInfo) => {
  await page.evaluate(() => sessionStorage.setItem('fascinlead:demo-role', 'admin'));
  await page.getByRole('button', { name: 'Abrir modo de desenvolvimento' }).click();
  await page.getByRole('button', { name: /Configuracoes da agenda/ }).click();
  await expect(page.getByRole('heading', { name: 'Configuracoes da agenda' })).toBeVisible();

  await page.getByLabel('Loja').selectOption('loja-06');
  await page.getByLabel('Duracao da consulta').fill('30');
  await page.getByLabel('Inicio').fill('08:00');
  await page.getByLabel('Fim').fill('18:00');
  await page.getByRole('button', { name: 'Salvar configuracao' }).click();
  await expect(page.getByText('Configuracao da agenda salva.')).toBeVisible();
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
