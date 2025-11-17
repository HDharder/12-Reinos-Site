# 🏰 12 Reinos - Sistema de Dados Automatizado

Este projeto é o motor de dados do site **12 Reinos**. Ele sincroniza automaticamente as planilhas do Google Sheets com este repositório, transformando os dados em JSON prontos para uso no site.

## ⚙️ Como Funciona

1.  **Edição:** Os mestres/jogadores editam as planilhas no Google Sheets.
2.  **Gatilho:** Na planilha, clicamos no menu `⏩ ATUALIZAR SITE`.
3.  **Processamento:** O GitHub Actions acorda, roda um script Python que:
    * Lê a configuração dinâmica na aba `Configuracoes`.
    * Baixa as abas solicitadas.
    * Limpa e converte os dados.
4.  **Publicação:** Os arquivos JSON são salvos na pasta `/dados` deste repositório.

## 🛠️ Como Adicionar Novas Planilhas

Não é necessário mexer no código!

1.  Vá na planilha Mestre ("12 Reinos Site").
2.  Abra a aba **`Site Config`**.
3.  Adicione uma nova linha com:
    * **nome_google:** Nome exato do arquivo.
    * **nome_aba:** Nome da aba.
    * **caminho_github:** Ex: `dados/nova_tabela.json`.
    * **linha_cabecalho:** Qual linha é o título (0 para a primeira).
4.  Rode a atualização pelo menu.

## 🚀 Status da Automação

![Status do Build](https://github.com/HDharder/12-Reinos-Site/actions/workflows/atualizar_site.yml/badge.svg)

---
*Desenvolvido com Python, Pandas e GitHub Actions. By HDharder*