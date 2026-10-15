import { expect, test } from '@playwright/test';

const password = 'AuvyroLocal!2026';
const users = [
  { email: 'admin@auvyro.local', name: 'Admin Local', role: 'staff' },
  { email: 'tecnico@auvyro.local', name: 'Técnico Local', role: 'staff' },
  { email: 'cliente.a@auvyro.local', name: 'Cliente A', role: 'client', ownTicket: 'Chamado fictício Aurora', hiddenTicket: 'Chamado fictício Boreal' },
  { email: 'cliente.b@auvyro.local', name: 'Cliente B', role: 'client', ownTicket: 'Chamado fictício Boreal', hiddenTicket: 'Chamado fictício Aurora' },
];

async function login(page, user) {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByTitle(user.name)).toBeVisible();
  await expect(page.getByText('Sessão Supabase protegida por RLS')).toBeVisible();
}

async function logout(page) {
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acessar Service Desk' })).toBeVisible();
}

async function openTickets(page) {
  await page.locator('.sidebar nav').getByRole('button', { name: /^Chamados/ }).click();
  await expect(page.getByRole('heading', { name: 'Chamados', exact: true })).toBeVisible();
}

test.describe.serial('Supabase Auth e operações pela interface', () => {
  test('autentica os quatro perfis e aplica o isolamento visual dos clientes', async ({ page }) => {
    for (const user of users) {
      await login(page, user);
      if (user.role === 'client') {
        await expect(page.getByRole('button', { name: 'Clientes', exact: true })).toHaveCount(0);
        await openTickets(page);
        await expect(page.getByText(user.ownTicket, { exact: true })).toBeVisible();
        await expect(page.getByText(user.hiddenTicket, { exact: true })).toHaveCount(0);
      } else {
        await expect(page.getByRole('button', { name: 'Clientes', exact: true })).toBeVisible();
      }
      await logout(page);
    }
  });

  test('persiste criação, atendimento, apontamentos, encerramento e arquivamento', async ({ page }) => {
    const title = 'Fluxo E2E Auth Aurora';
    const client = users[2];
    const technician = users[1];

    await login(page, client);
    await page.getByRole('button', { name: 'Abrir chamado', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Abrir chamado' });
    await dialog.getByLabel('Assunto').fill(title);
    await dialog.getByLabel('Descrição').fill('Chamado fictício criado pelo teste automatizado de homologação.');
    await dialog.getByRole('button', { name: 'Criar chamado', exact: true }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await page.getByPlaceholder('Escreva uma atualização para o histórico...').fill('Comentário do cliente via interface.');
    await page.getByRole('button', { name: 'Comentar', exact: true }).click();
    await expect(page.getByText('Comentário do cliente via interface.', { exact: true })).toBeVisible();
    await logout(page);

    await login(page, technician);
    await openTickets(page);
    await page.getByLabel('Pesquisar chamados').fill(title);
    await page.getByRole('button', { name: new RegExp(title) }).click();
    await page.getByRole('button', { name: 'Assumir', exact: true }).click();
    await expect(page.locator('.property').filter({ hasText: 'RESPONSÁVEL' })).toContainText('Técnico Local');

    await page.getByLabel('Status').selectOption({ label: 'Em triagem' });
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await expect(page.locator('.detail-id')).toContainText('Em atendimento');

    await page.locator('.tab-list').getByRole('button', { name: /Apontamentos/ }).click();
    await page.getByLabel('Atividade').fill('Atendimento remoto E2E');
    await page.getByLabel('Duração (min)').fill('240');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    const remoteEntry = page.locator('.time-history article').filter({ hasText: 'Atendimento remoto E2E' });
    await expect(remoteEntry).toContainText('Franquia');

    await page.getByLabel('Atividade').fill('Excedente remoto E2E');
    await page.getByLabel('Duração (min)').fill('30');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect(page.locator('.time-history article').filter({ hasText: 'Excedente remoto E2E' })).toContainText('Franquia');

    await page.getByLabel('Atividade').fill('Presencial faturável E2E');
    await page.getByLabel('Duração (min)').fill('60');
    await page.getByLabel('Modalidade').selectOption('Presencial');
    await expect(page.getByLabel('Faturável fora da franquia')).toBeChecked();
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect(page.locator('.time-history article').filter({ hasText: 'Presencial faturável E2E' })).toContainText('Faturável');

    await page.getByLabel('Atividade').fill('Cortesia presencial E2E');
    await page.getByLabel('Modalidade').selectOption('Presencial');
    await page.getByLabel('Faturável fora da franquia').uncheck();
    await page.getByLabel('Justificativa da exceção').fill('Cortesia aprovada para homologação.');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    const courtesyEntry = page.locator('.time-history article').filter({ hasText: 'Cortesia presencial E2E' });
    await expect(courtesyEntry).toContainText('Não consome');
    await expect(courtesyEntry).not.toContainText('Franquia');

    await page.getByRole('button', { name: 'Resolver', exact: true }).click();
    await expect(page.locator('.detail-id')).toContainText('Resolvido');
    await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
    await expect(page.locator('.detail-id')).toContainText('Encerrado');
    await page.getByPlaceholder('Informe o motivo').fill('Fluxo automatizado concluído.');
    await page.getByRole('button', { name: 'Arquivar com justificativa', exact: true }).click();

    await page.getByLabel('Pesquisar chamados').fill(title);
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Contratos', exact: true }).click();
    const contract = page.locator('.contract-card').filter({ hasText: 'Empresa Fictícia Aurora' });
    await expect(contract).toContainText('04:30');
    await expect(contract).toContainText('00:00');
    await expect(contract).toContainText('01:30');
    await page.getByRole('button', { name: 'Apontamentos', exact: true }).click();
    await expect(page.getByText('Atendimento remoto E2E', { exact: true })).toBeVisible();
    await expect(page.getByText('Excedente remoto E2E', { exact: true })).toBeVisible();
    await expect(page.getByText('Presencial faturável E2E', { exact: true })).toBeVisible();
    await expect(page.getByText('Cortesia presencial E2E', { exact: true })).toBeVisible();
    await logout(page);

    await login(page, technician);
    await page.getByRole('button', { name: 'Apontamentos', exact: true }).click();
    await expect(page.getByText('Atendimento remoto E2E', { exact: true })).toBeVisible();
    await expect(page.getByText('Excedente remoto E2E', { exact: true })).toBeVisible();
    await expect(page.getByText('Presencial faturável E2E', { exact: true })).toBeVisible();
    await expect(page.getByText('Cortesia presencial E2E', { exact: true })).toBeVisible();
    await logout(page);
  });
});
