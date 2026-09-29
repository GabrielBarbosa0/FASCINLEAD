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
  await page.getByLabel('Horario').fill('14:30');
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
  await expect(page.getByLabel('Horario')).toHaveValue('14:30');
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
