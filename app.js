// Estado Global
let configSite = [];
let dadosAtuais = []; // Guarda os dados da página aberta para filtro

// Carrega as cores da planilha e aplica no CSS
async function carregarEstilos() {
    try {
        const resp = await fetch('style_config.json?nocache=' + Date.now());
        const estilos = await resp.json();
        
        // O Segredo: Percorre cada linha da planilha e injeta no CSS do navegador
        const root = document.documentElement;
        
        for (const [chave, valor] of Object.entries(estilos)) {
            // Só aplica se a chave começar com "--" (segurança básica)
            if (chave.startsWith('--')) {
                root.style.setProperty(chave, valor);
            }
            
            // BÔNUS: Configurações que não são CSS
            if (chave === 'titulo_site') {
                document.title = valor;
                document.querySelector('.navbar-brand').innerText = valor;
            }
        }
        console.log("🎨 Estilos personalizados aplicados!");
    } catch (e) {
        console.log("Usando estilos padrão (não foi possível carregar personalização).");
    }
}

// 1. INICIALIZAÇÃO
async function init() {
    // 1. Carrega visual primeiro
    await carregarEstilos();

    // 2. Depois carrega conteúdo
    try {
        const resp = await fetch('site_layout.json?nocache=' + Date.now());
        configSite = await resp.json();
        construirInterface();
    } catch (e) {
        console.error("Erro fatal:", e);
    }
}

// 2. CONSTRÓI MENU E HOME
function construirInterface() {
    const navContainer = document.getElementById('nav-links-container');
    const homeContainer = document.getElementById('view-home');

    navContainer.innerHTML = '';
    homeContainer.innerHTML = '';

    configSite.forEach((item, index) => {
        // A. Botão da Navbar (Pequeno)
        const btnNav = document.createElement('button');
        btnNav.className = 'nav-btn';
        btnNav.innerText = item.nome_menu;
        btnNav.onclick = () => abrirPagina(index);
        navContainer.appendChild(btnNav);

        // B. Card da Home (Grande)
        const cardHome = document.createElement('div');
        cardHome.className = 'home-card';
        cardHome.innerHTML = `
            <h3>${item.nome_menu}</h3>
            <p>Ver lista completa</p>
        `;
        cardHome.onclick = () => abrirPagina(index);
        homeContainer.appendChild(cardHome);
    });
}

// 3. NAVEGAÇÃO: MOSTRAR HOME
function mostrarHome() {
    // Esconde Tabela, Mostra Home
    document.getElementById('view-data').classList.add('hidden');
    document.getElementById('view-home').classList.remove('hidden');
    
    // Reseta botões ativos
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

// 4. NAVEGAÇÃO: ABRIR UMA PÁGINA
async function abrirPagina(index) {
    const item = configSite[index];
    
    // UI: Troca visibilidade
    document.getElementById('view-home').classList.add('hidden');
    const viewData = document.getElementById('view-data');
    viewData.classList.remove('hidden');

    // UI: Marca botão ativo
    document.querySelectorAll('.nav-btn').forEach((btn, i) => {
        if (i === index) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Carregar Dados
    const tableWrapper = document.getElementById('table-wrapper');
    tableWrapper.innerHTML = '<p style="color:#888">Carregando grimório...</p>';
    document.getElementById('search-box').value = ''; // Limpa busca

    try {
        const resp = await fetch(item.arquivo_json + '?t=' + Date.now());
        dadosAtuais = await resp.json();
        
        renderizarTabela(dadosAtuais, item);
    } catch (e) {
        tableWrapper.innerHTML = `<p style="color:red">Erro ao abrir pergaminho: ${item.arquivo_json}</p>`;
    }
}

// 5. RENDERIZAÇÃO DA TABELA
function renderizarTabela(dados, config) {
    const container = document.getElementById('table-wrapper');
    container.innerHTML = '';

    if (!dados || dados.length === 0) {
        container.innerHTML = '<p>Nenhum registro encontrado.</p>';
        return;
    }

    // Descobre colunas
    let colunas = [];
    if (config.colunas_visiveis && config.colunas_visiveis.trim() !== "") {
        colunas = config.colunas_visiveis.split(',').map(c => c.trim());
    } else {
        colunas = Object.keys(dados[0]);
    }

    // Cria Tabela HTML
    const table = document.createElement('table');
    
    // Cabeçalho
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    colunas.forEach(col => {
        const th = document.createElement('th');
        th.innerText = col;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Corpo
    const tbody = document.createElement('tbody');
    dados.forEach(row => {
        const tr = document.createElement('tr');
        colunas.forEach(col => {
            const td = document.createElement('td');
            td.innerText = row[col] || "—";
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);
}

// 6. FILTRO DE BUSCA (Rápido)
function filtrarDados() {
    const termo = document.getElementById('search-box').value.toLowerCase();
    const linhas = document.querySelectorAll('tbody tr');

    linhas.forEach(tr => {
        const texto = tr.innerText.toLowerCase();
        if (texto.includes(termo)) {
            tr.style.display = '';
        } else {
            tr.style.display = 'none';
        }
    });
}

// Start
init();