# venv\Scripts\activate
import gspread
from google.oauth2.service_account import Credentials
import pandas as pd
import json
import requests
import base64
import os
from dotenv import load_dotenv # Nova biblioteca

# Carrega variáveis do arquivo .env (se existir no PC)
load_dotenv()

# --- 1. CONFIGURAÇÕES ---
ARQUIVO_CREDENCIAIS = 'credenciais_google.json'
ARQUIVO_CONFIG_ETL = 'config.json'
ARQUIVO_LAYOUT_SITE = 'site_layout.json'

# ONDE ESTÁ A CONFIGURAÇÃO NO GOOGLE?
PLANILHA_MESTRE_CONFIG = '12 Reinos Site' 
ABA_ETL_CONFIG = 'Site Config'
ABA_SITE_LAYOUT = 'Site Layout'

# DADOS DO GITHUB
# AQUI ESTÁ O TRUQUE: Ele busca nas variáveis de ambiente, não no código escrito
TOKEN_GITHUB = os.getenv('TOKEN_GITHUB') 
NOME_REPO_GITHUB = 'HDharder/12-Reinos-Site' # Esse pode ficar aqui, não é secreto

# Verifica se o token foi encontrado
if not TOKEN_GITHUB:
    print("ERRO CRÍTICO: Token do GitHub não encontrado! Verifique o .env ou os Secrets.")
    exit()

# --- 2. FUNÇÕES AUXILIARES ---

def conectar_google():
    print("🔌 Conectando ao Google...")
    escopo = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    try:
        creds = Credentials.from_service_account_file(ARQUIVO_CREDENCIAIS, scopes=escopo)
        return gspread.authorize(creds)
    except Exception as e:
        print(f"❌ Erro conexão Google: {e}")
        return None

def atualizar_configs_locais(cliente):
    """Lê as DUAS abas de configuração e salva os JSONs locais."""
    print("\n📥 Baixando configurações...")
    try:
        planilha = cliente.open(PLANILHA_MESTRE_CONFIG)
        
        # 1. Atualizar Config de ETL (Leitura de dados)
        aba_etl = planilha.worksheet(ABA_ETL_CONFIG)
        dados_etl = aba_etl.get_all_records()
        
        # Limpeza básica dos dados de ETL
        etl_limpo = []
        for item in dados_etl:
            if item.get('nome_google'):
                # Trata linha_cabecalho vazio como 0
                linha = item.get('linha_cabecalho')
                item['linha_cabecalho'] = int(linha) if linha != '' and linha is not None else 0
                
                # Trata intervalo vazio
                if item.get('intervalo') is None: item['intervalo'] = ""
                etl_limpo.append(item)

        with open(ARQUIVO_CONFIG_ETL, 'w', encoding='utf-8') as f:
            json.dump(etl_limpo, f, indent=4, ensure_ascii=False)
        print(f"✅ {ARQUIVO_CONFIG_ETL} atualizado ({len(etl_limpo)} tarefas).")

        # 2. Atualizar Layout do Site (NOVO!)
        try:
            aba_site = planilha.worksheet(ABA_SITE_LAYOUT)
            dados_site = aba_site.get_all_records()
            # Salva direto, o JS do site vai se virar com os dados
            with open(ARQUIVO_LAYOUT_SITE, 'w', encoding='utf-8') as f:
                json.dump(dados_site, f, indent=4, ensure_ascii=False)
            print(f"✅ {ARQUIVO_LAYOUT_SITE} atualizado.")
            
            # Retorna True para avisar que precisamos enviar esse arquivo pro GitHub também
            return True 
        except gspread.WorksheetNotFound:
            print(f"⚠️ Aba '{ABA_SITE_LAYOUT}' não encontrada. O site usará o layout antigo.")
            return False

    except Exception as e:
        print(f"❌ Erro ao baixar configs: {e}")
        return False

def processar_planilhas(cliente):
    """Lê o config.json e gera os arquivos de dados."""
    if not os.path.exists(ARQUIVO_CONFIG_ETL): return []

    with open(ARQUIVO_CONFIG_ETL, 'r', encoding='utf-8') as f:
        tarefas = json.load(f)
    
    arquivos_para_enviar = [] # Lista de tuplas (conteudo, caminho)

    print("\n🏭 Processando dados...")
    for tarefa in tarefas:
        nome = tarefa['nome_google']
        caminho = tarefa['caminho_github']
        print(f"   -> Lendo: {nome}...")
        
        try:
            planilha = cliente.open(nome)
            aba_nome = tarefa.get('nome_aba')
            aba = planilha.worksheet(aba_nome) if aba_nome else planilha.get_worksheet(0)
            
            # Leitura
            intervalo = tarefa.get('intervalo')
            dados_brutos = aba.get(intervalo) if intervalo else aba.get_all_values()
            
            idx = tarefa.get('linha_cabecalho', 0)
            if len(dados_brutos) <= idx: continue

            cabecalho = dados_brutos[idx]
            linhas = dados_brutos[idx+1:]
            
            df = pd.DataFrame(linhas, columns=cabecalho)
            df = df.loc[:, df.columns != ''] # Remove colunas sem nome
            
            # Limpeza Limpa
            df = df.replace(r'^\s*$', '', regex=True)
            df = df[~(df == '').all(axis=1)]
            
            json_str = df.to_json(orient='records', force_ascii=False, indent=4)
            arquivos_para_enviar.append((json_str, caminho))
            
        except Exception as e:
            print(f"      Erro: {e}")

    return arquivos_para_enviar

def enviar_github(conteudo_str, caminho):
    """Envia para o GitHub via API."""
    print(f"🚀 Enviando: {caminho}...")
    url = f"https://api.github.com/repos/{NOME_REPO_GITHUB}/contents/{caminho}"
    headers = {"Authorization": f"token {TOKEN_GITHUB}", "Accept": "application/vnd.github.v3+json"}
    
    sha = None
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200: sha = r.json().get('sha')
    except: pass

    b64_content = base64.b64encode(conteudo_str.encode('utf-8')).decode('utf-8')
    payload = {"message": "Auto Update", "content": b64_content}
    if sha: payload["sha"] = sha
    
    requests.put(url, headers=headers, data=json.dumps(payload))

# --- 3. EXECUÇÃO ---
if __name__ == "__main__":
    cliente = conectar_google()
    if cliente:
        # 1. Atualiza configs locais
        layout_atualizado = atualizar_configs_locais(cliente)
        
        # 2. Se o layout mudou, envia o arquivo de layout pro GitHub também
        if layout_atualizado:
            with open(ARQUIVO_LAYOUT_SITE, 'r', encoding='utf-8') as f:
                layout_content = f.read()
            enviar_github(layout_content, ARQUIVO_LAYOUT_SITE)

        # 3. Processa e envia os dados
        arquivos = processar_planilhas(cliente)
        for conteudo, caminho in arquivos:
            enviar_github(conteudo, caminho)
            
    print("\n✨ FIM ✨")