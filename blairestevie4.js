const { chromium } = require('playwright');
const fs = require('fs');
const axios = require('axios');

// Variáveis da API
const BASE_URL_GET_ACTION = "http://api.ganharnoinsta.com/get_action.php";
const BASE_URL_CONFIRM_ACTION = "http://api.ganharnoinsta.com/confirm_action.php";
const TOKEN = "98664a53-aad2-4189-ad45-82fbda6624e7";
const DADOS_PERFIL = "blairestevie4";
const TIPO_DE_ACAO = "3";
const SHA1 = "e5990261605cd152f26c7919192d4cd6f6e22227";
const ID_CONTA = "68121675059";
let ID_PEDIDO;

// Função para aguardar um tempo especificado (em milissegundos)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função principal encapsulada
async function runAutomation() {
    try {
        console.log('[INFO] Iniciando o script de automação do Instagram.');

        // 1. Chamada à API `get_action` para obter dados da ação
        console.log('[INFO] Solicitando dados da ação da API...');
        const responseGetAction = await axios.get(BASE_URL_GET_ACTION, {
            params: {
                token: TOKEN,
                sha1: SHA1,
                id_conta: ID_CONTA,
                is_instagram: 1,
                tipo: TIPO_DE_ACAO
            }
        });

        console.log('[DEBUG] Resposta completa da API:', responseGetAction.data);

        const actionData = responseGetAction.data;
        ID_PEDIDO = actionData.id_pedido;
        const userToFollow = actionData.nome_usuario;

        if (!ID_PEDIDO || !userToFollow) {
            throw new Error('[ERROR] Não foi possível obter o ID do pedido ou o usuário da API.');
        }

        console.log('[INFO] Dados da ação recebidos com sucesso:', actionData);

        // 2. Chamada à API `confirm_action` para confirmar a ação preliminar
        console.log('[INFO] Confirmando a ação preliminar na API...');
        const responsePreConfirmAction = await axios.get(BASE_URL_CONFIRM_ACTION, {
            params: {
                token: TOKEN,
                sha1: SHA1,
                id_conta: ID_CONTA,
                id_pedido: ID_PEDIDO,
                is_instagram: 1
            }
        });

        console.log('[DEBUG] Resposta da API de confirmação preliminar:', responsePreConfirmAction.data);
        if (responsePreConfirmAction.data.message !== 'CONFIRMOU_SUCESSO') {
            throw new Error('[ERROR] Falha na confirmação preliminar da ação.');
        }

        console.log('[INFO] Ação preliminar confirmada com sucesso.');

        // 3. Automação com Playwright
        console.log('[INFO] Carregando cookies...');
        const cookies = JSON.parse(fs.readFileSync('blairestevie4.json', 'utf-8'));
        console.log('[INFO] Cookies carregados com sucesso.');

        console.log('[INFO] Iniciando o navegador Chrome em modo headless...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        console.log('[INFO] Navegador iniciado com sucesso.');

        console.log('[INFO] Definindo cookies no contexto do navegador...');
        await context.addCookies(cookies);
        console.log('[INFO] Cookies definidos com sucesso.');

        // Aguardar 3 horas (10800000 milissegundos) APÓS aplicar os cookies
        console.log('[INFO] Aguardando 3 horas após definir os cookies...');
        await delay(10800000);  // Pausa de 3 horas

        // Acessa o perfil do usuário a ser seguido
        const page = await context.newPage();
        const profileUrl = `https://www.instagram.com/${userToFollow}/`;
        console.log(`[INFO] Acessando a página do perfil do Instagram do usuário ${userToFollow}...`);
        await page.goto(profileUrl, { timeout: 999999 });
        console.log('[INFO] Página do perfil carregada com sucesso.');
        await page.waitForTimeout(3000);

        // Navega até o botão "Seguir" usando a tecla Tab
        console.log('[INFO] Navegando até o botão "Seguir" usando a tecla Tab...');
        for (let i = 0; i < 3; i++) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(500);
        }

        console.log('[INFO] Pressionando Enter para seguir o perfil...');
        await page.keyboard.press('Enter');
        console.log('[INFO] Botão "Seguir" acionado com sucesso.');

        console.log('[INFO] Fechando o navegador...');
        await browser.close();
        console.log('[INFO] Navegador fechado com sucesso.');

        // 4. Chamada à API `confirm_action` para confirmar a ação final
        console.log('[INFO] Confirmando a ação final na API...');
        const responseConfirmAction = await axios.get(BASE_URL_CONFIRM_ACTION, {
            params: {
                token: TOKEN,
                sha1: SHA1,
                id_conta: ID_CONTA,
                id_pedido: ID_PEDIDO,
                is_instagram: 1
            }
        });

        console.log('[DEBUG] Resposta da API de confirmação final:', responseConfirmAction.data);

        if (responseConfirmAction.data.status !== 'SUCESSO') {
            throw new Error('[ERROR] Falha na confirmação final da ação.');
        }

        console.log('[INFO] Ação final confirmada com sucesso:', responseConfirmAction.data);
    } catch (error) {
        console.error('[ERROR] Ocorreu um erro durante a execução do script:', error.message);
        throw error; // Lança o erro para que o loop de retry possa capturá-lo e reiniciar a execução
    }
}

// Função para gerenciar as tentativas automáticas de reinicialização
async function executeWithRetry(retries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[INFO] Tentativa ${attempt} de ${retries}...`);
            await runAutomation();
            console.log('[INFO] Automação concluída com sucesso!');
            break; // Se a execução for bem-sucedida, sai do loop
        } catch (error) {
            console.error(`[ERROR] Erro na tentativa ${attempt}:`, error.message);
            if (attempt === retries) {
                console.error('[ERROR] Todas as tentativas falharam. Abortando.');
                process.exit(1);
            } else {
                console.log('[INFO] Reiniciando a automação...');
                await delay(5000); // Aguardar 5 segundos antes de tentar novamente
            }
        }
    }
}

// Iniciar a automação com até 999 tentativas
executeWithRetry(999);
