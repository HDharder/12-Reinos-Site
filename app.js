// Variável para guardar o JSON de layout
let layoutConfig = [];

// 1. Inicialização: Busca a configuração do site
async function carregarSite() {
    try {
        const response = await fetch('site_layout.json?nocache=' + new Date().getTime());
        layoutConfig = await response.json();
        construirMenu();
    } catch (error) {
        console.error("Erro ao carregar layout:", error);
        document.getElementById('menu-dinamico').innerHTML = "<p style='color:red'>Erro ao carregar site_layout.json</p>";
    }
}

// 2. Constrói os botões do menu baseados no JSON
function construirMenu() {
    const menuContainer = document.getElementById('menu-dinamico');
    menuContainer.innerHTML = ''; // Limpa carregamento

    layoutConfig.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.innerText = item.nome_menu;
        btn.onclick = () => carregarPagina(index);
        menuContainer.appendChild(btn);
    });

    // Carrega a primeira página automaticamente se houver
    if (layoutConfig.length > 0) {
        carregarPagina(0);
    }
}

// 3. Carrega os dados da página selecionada
async function carregarPagina(index) {
    // UI: Atualiza titulo e botões ativos
    const item = layoutConfig[index];
    document.getElementById('titulo-pagina').innerText = item.nome_menu;
    
    const botoes = document.querySelectorAll('#menu-dinamico button');
    botoes.forEach(b => b.classList.remove('active'));
    botoes[index].classList.add('active');

    const areaDados = document.getElementById('area-dados');
    areaDados.innerHTML = '<p>Carregando dados...</p>';

    try {
        // Busca o arquivo de dados (ex: dados/personagens.json)
        // Adiciona timestamp para evitar cache antigo
        const response = await fetch(item.arquivo_json + '?t=' + new Date().getTime());
        const dados = await response.json();

        renderizarDados(dados, item);
    } catch (error) {
        areaDados.innerHTML = `<p style='color:red'>Erro ao carregar dados: ${item.arquivo_json}</p>`;
        console.error(error);
    }
}

// 4. Renderiza (Desenha) os dados na tela
function renderizarDados(dados, config) {
    const areaDados = document.getElementById('area-dados');
    areaDados.innerHTML = '';

    if (dados.length === 0) {
        areaDados.innerHTML = '<p>Nenhum dado encontrado.</p>';
        return;
    }

    // Define quais colunas mostrar
    // Se config.colunas_visiveis for vazio, pega todas as chaves do primeiro objeto
    let colunas = [];
    if (config.colunas_visiveis && config.colunas_visiveis.trim() !== "") {
        colunas = config.colunas_visiveis.split(',').map(c => c.trim());
    } else {
        colunas = Object.keys(dados[0]);
    }

    // Decide o modo de exibição
    if (config.tipo_exibicao && config.tipo_exibicao.toLowerCase() === 'cards') {
        criarCards(dados, colunas, areaDados);
    } else {
        criarTabela(dados, colunas, areaDados);
    }
}

function criarTabela(dados, colunas, container) {
    const table = document.createElement('table');
    table.id = "tabela-dados"; // ID para o filtro funcionar

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
    dados.forEach(linha => {
        const tr = document.createElement('tr');
        colunas.forEach(col => {
            const td = document.createElement('td');
            td.innerText = linha[col] || "-"; // Se não tiver dado, põe traço
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}

function criarCards(dados, colunas, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cards-wrapper';

    dados.forEach(linha => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // A primeira coluna vira o Título do Card
        const titulo = linha[colunas[0]];
        const h3 = document.createElement('h3');
        h3.innerText = titulo;
        card.appendChild(h3);

        // O resto vira parágrafos
        colunas.slice(1).forEach(col => {
            const p = document.createElement('p');
            p.innerHTML = `<strong>${col}:</strong> ${linha[col] || ""}`;
            card.appendChild(p);
        });
        wrapper.appendChild(card);
    });
    container.appendChild(wrapper);
}

// 5. Filtro simples (Busca na tabela)
function filtrarTabela() {
    const termo = document.getElementById('filtro-global').value.toLowerCase();
    const linhas = document.querySelectorAll('tbody tr'); // Busca só nas linhas da tabela

    linhas.forEach(tr => {
        const texto = tr.innerText.toLowerCase();
        tr.style.display = texto.includes(termo) ? '' : 'none';
    });
}

// Inicia tudo
carregarSite();