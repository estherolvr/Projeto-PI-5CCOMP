"""
Comparacao de Modelos -- Agente de Monitoramento (ASA)
Projeto Interdisciplinar . Entrega 1
Inteligencia Artificial e Aprendizagem de Maquina . FECAP . 5o Semestre 2026

Este script parte de `base_unificada_asa-final.csv` (ja pronta) e treina e
compara os 4 algoritmos de classificacao vistos em aula: Regressao Logistica,
KNN, Arvore de Decisao e Random Forest. Ao final, escolhe a melhor baseline,
explica os fatores mais relevantes e gera o score Verde/Amarelo/Vermelho.

Uso:
    python asa_comparacao_modelos.py

Coloque o arquivo base_unificada_asa-final.csv na mesma pasta deste script
(ou ajuste o caminho na variavel CSV_PATH abaixo). Os graficos abrem em
janelas separadas (plt.show()) e os resultados numericos sao salvos em CSV
ao final.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
)

CSV_PATH = "base_unificada_asa-final.csv"


# ---------------------------------------------------------------------------
# Bloco 1 -- Carregar a base unificada
# ---------------------------------------------------------------------------
# Restam pouquissimos nulos residuais (alunos com registro incompleto em
# Contato) -- removemos com dropna(), ja que sao poucas linhas (4 de 12.846).

def carregar_base(caminho: str) -> pd.DataFrame:
    df = pd.read_csv(caminho).dropna()
    print("Formato:", df.shape)
    print("Taxa de evasao:", df["evadiu"].mean().round(3))
    return df


# ---------------------------------------------------------------------------
# Bloco 2 -- Preparar as features
# ---------------------------------------------------------------------------
# - ID_ALUNO sai -- e so identificador, nao informacao.
# - Grau Academico sai -- depois do filtro de ensino superior (feito no guia
#   de unificacao), essa coluna quase nao varia mais, carrega pouca informacao.
# - tem_bolsa e booleano (True/False) -- convertido pra 0/1.
# - As demais categoricas (Forma de Ingresso, Turno, Estado Civil, Sexo)
#   viram dummies (Aula 03).

CATEGORICAS = ["Forma de Ingresso", "Turno", "Estado Civil", "Sexo"]


def preparar_features(df: pd.DataFrame):
    df_modelo = df.drop(columns=["ID_ALUNO", "Grau Acadêmico"])
    df_modelo["tem_bolsa"] = df_modelo["tem_bolsa"].astype(int)
    df_modelo = pd.get_dummies(df_modelo, columns=CATEGORICAS, drop_first=True)

    X = df_modelo.drop(columns=["evadiu"])
    y = df_modelo["evadiu"]

    print(f"Total de features: {X.shape[1]}")
    print(X.columns.tolist())
    return X, y


# ---------------------------------------------------------------------------
# Bloco 3 -- Treino, teste e normalizacao
# ---------------------------------------------------------------------------
# Regressao Logistica e KNN usam distancia/otimizacao baseada em gradiente,
# entao normalizamos com StandardScaler (evita ConvergenceWarning e melhora
# um pouco a acuracia). Arvore de Decisao e Random Forest nao precisam de
# normalizacao -- dividem por limiar em cada variavel, entao a escala nao
# afeta o resultado.

def dividir_e_normalizar(X, y):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    scaler = StandardScaler()
    X_train_norm = scaler.fit_transform(X_train)
    X_test_norm = scaler.transform(X_test)

    print("Treino:", X_train.shape, " Teste:", X_test.shape)
    return X_train, X_test, y_train, y_test, X_train_norm, X_test_norm, scaler


# ---------------------------------------------------------------------------
# Bloco 4 -- Treinar os 4 algoritmos
# ---------------------------------------------------------------------------

def treinar_modelos(X_train, X_train_norm, y_train):
    modelos = {}

    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(X_train_norm, y_train)
    modelos["Regressao Logistica"] = lr

    knn = KNeighborsClassifier(n_neighbors=5)
    knn.fit(X_train_norm, y_train)
    modelos["KNN (k=5)"] = knn

    dt = DecisionTreeClassifier(max_depth=6, random_state=42)
    dt.fit(X_train, y_train)
    modelos["Arvore de Decisao"] = dt

    rf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
    rf.fit(X_train, y_train)
    modelos["Random Forest"] = rf

    print("4 modelos treinados.")
    return modelos


# ---------------------------------------------------------------------------
# Bloco 5 -- Avaliar e comparar (acuracia, precisao, recall, F1)
# ---------------------------------------------------------------------------
# Como a base e desbalanceada (~20% de evasao), olhamos alem da acuracia:
# precisao, recall e F1 mostram melhor o desempenho na classe que importa
# (evadiu=1).

def avaliar(nome, modelo, X_te, y_test):
    pred = modelo.predict(X_te)
    return {
        "Modelo": nome,
        "Acuracia": accuracy_score(y_test, pred),
        "Precisao": precision_score(y_test, pred),
        "Recall": recall_score(y_test, pred),
        "F1": f1_score(y_test, pred),
    }


def comparar_modelos(modelos, X_test, X_test_norm, y_test):
    linhas = [
        avaliar("Regressao Logistica", modelos["Regressao Logistica"], X_test_norm, y_test),
        avaliar("KNN (k=5)", modelos["KNN (k=5)"], X_test_norm, y_test),
        avaliar("Arvore de Decisao", modelos["Arvore de Decisao"], X_test, y_test),
        avaliar("Random Forest", modelos["Random Forest"], X_test, y_test),
    ]
    comparacao = pd.DataFrame(linhas).set_index("Modelo")
    comparacao_pct = (comparacao * 100).round(1)
    print(comparacao_pct)

    comparacao_pct.plot(kind="bar", figsize=(9, 5))
    plt.title("Comparacao dos 4 modelos (base de teste)")
    plt.ylabel("%")
    plt.ylim(0, 100)
    plt.xticks(rotation=15)
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.show()

    melhor_modelo_nome = comparacao["F1"].idxmax()
    print(f"Melhor modelo por F1: {melhor_modelo_nome}")
    return comparacao, comparacao_pct, melhor_modelo_nome


# Conclusao esperada: o Random Forest costuma ter o melhor F1 e a melhor
# precisao entre os 4, sendo escolhido como baseline. KNN e Regressao
# Logistica tendem a ficar atras em recall/F1 -- provavelmente porque a
# fronteira de decisao real nao e bem aproximada por uma reta (Regressao
# Logistica) nem por vizinhos proximos em alta dimensao (KNN), enquanto os
# modelos baseados em arvore capturam melhor interacoes nao-lineares entre
# as features.


# ---------------------------------------------------------------------------
# Bloco 6 -- Matriz de confusao do melhor modelo (Random Forest)
# ---------------------------------------------------------------------------

def matriz_confusao_rf(rf, X_test, y_test):
    pred_rf = rf.predict(X_test)
    cm = confusion_matrix(y_test, pred_rf)

    fig, ax = plt.subplots(figsize=(5, 4))
    ax.imshow(cm, cmap="Greens")
    for i in range(2):
        for j in range(2):
            ax.text(j, i, cm[i, j], ha="center", va="center", fontsize=14)
    ax.set_xticks([0, 1]); ax.set_xticklabels(["Nao evadiu", "Evadiu"])
    ax.set_yticks([0, 1]); ax.set_yticklabels(["Nao evadiu", "Evadiu"])
    ax.set_xlabel("Predito"); ax.set_ylabel("Real")
    ax.set_title("Matriz de confusao -- Random Forest")
    plt.tight_layout()
    plt.show()

    print(classification_report(y_test, pred_rf, target_names=["Nao evadiu", "Evadiu"]))
    return pred_rf


# ---------------------------------------------------------------------------
# Bloco 7 -- Explicacao dos fatores
# ---------------------------------------------------------------------------
# O documento do projeto pede "explicacao dos fatores". Para o Random Forest
# usamos feature_importances_; para a Regressao Logistica, os coeficientes
# (positivo = aumenta a chance de evasao, negativo = diminui).

def explicar_fatores(rf, lr, X):
    importancias = pd.Series(rf.feature_importances_, index=X.columns).sort_values(ascending=False)

    plt.figure(figsize=(9, 10))
    importancias.sort_values().plot(kind="barh")
    plt.xlabel("Importancia (Random Forest)")
    plt.title("Fatores mais relevantes -- Random Forest")
    plt.tight_layout()
    plt.show()

    print("Top 10 features (Random Forest):")
    print(importancias.head(10))

    coeficientes = pd.Series(lr.coef_[0], index=X.columns).sort_values()
    plt.figure(figsize=(9, 10))
    coeficientes.plot(kind="barh")
    plt.xlabel("Coeficiente (impacto na chance de evasao)")
    plt.title("Fatores mais relevantes -- Regressao Logistica")
    plt.tight_layout()
    plt.show()

    # ATENCAO -- resultado a levar em consideracao: investigando os
    # coeficientes da Regressao Logistica, pct_parcelas_em_aberto tem
    # coeficiente NEGATIVO -- o modelo aprendeu que ter parcela "em aberto"
    # esta associado a NAO evadir. Isso provavelmente acontece porque
    # parcelas de quem evade tendem a ser CANCELADAS no sistema, nao ficam
    # "em aberto" -- ou seja, a coluna mede em parte "ainda matriculado",
    # nao so "dificuldade financeira". Vale documentar isso como limitacao
    # no relatorio, e considerar refinar a feature (ex.: contar so parcelas
    # vencidas e nao pagas, comparando com a data de hoje).

    return importancias, coeficientes


# ---------------------------------------------------------------------------
# Bloco 8 -- Arvore de Decisao: visualizando as regras (bonus de interpretabilidade)
# ---------------------------------------------------------------------------

def visualizar_arvore(dt, X):
    plt.figure(figsize=(20, 10))
    plot_tree(dt, feature_names=X.columns, class_names=["Nao evadiu", "Evadiu"],
              filled=True, max_depth=2, fontsize=9)
    plt.title("Arvore de Decisao (2 primeiros niveis)")
    plt.show()


# ---------------------------------------------------------------------------
# Bloco 9 -- Score de 0 a 100 e classificacao Verde/Amarelo/Vermelho
# ---------------------------------------------------------------------------
# O documento do projeto pede um score de 0 a 100 e uma classificacao em 3
# categorias. Usamos o predict_proba() do Random Forest (melhor modelo).
#
# ATENCAO: os limites 33/66 abaixo sao ponto de partida -- ajustem olhando a
# distribuicao real dos scores de voces, e validem com o ASA antes de
# considerar final (e o que o documento do projeto pede: "limites
# configuraveis e aprovados pela FECAP/ASA").

def classificar(s):
    if s < 33:
        return "Verde"
    elif s < 66:
        return "Amarelo"
    else:
        return "Vermelho"


def gerar_score(rf, df, X_test, y_test):
    probabilidades = rf.predict_proba(X_test)[:, 1]
    score = (probabilidades * 100).round(1)
    classificacao = [classificar(s) for s in score]

    resultado = pd.DataFrame({
        "ID_ALUNO": df.loc[X_test.index, "ID_ALUNO"].values,
        "score": score,
        "classificacao": classificacao,
    })
    print(resultado.head(10))
    print("\n", resultado["classificacao"].value_counts())
    print("\n", (resultado["classificacao"].value_counts(normalize=True) * 100).round(1))

    plt.figure(figsize=(8, 4))
    plt.hist(score, bins=30, color="#0B2E22")
    plt.axvline(33, color="orange", linestyle="--", label="limite Verde/Amarelo (33)")
    plt.axvline(66, color="red", linestyle="--", label="limite Amarelo/Vermelho (66)")
    plt.xlabel("Score de risco de evasao")
    plt.ylabel("Numero de alunos")
    plt.title("Distribuicao do score -- conjunto de teste")
    plt.legend()
    plt.tight_layout()
    plt.show()

    return resultado


# ---------------------------------------------------------------------------
# Bloco 10 -- Testar 3 alunos especificos, com perfis diferentes
# ---------------------------------------------------------------------------
# Pegamos 1 exemplo de cada classificacao (Verde, Amarelo, Vermelho) do
# proprio conjunto de teste, pra ver o modelo aplicado em casos concretos,
# lado a lado.

def exemplos_conjunto_teste(df, resultado):
    id_verde = resultado[resultado["classificacao"] == "Verde"]["ID_ALUNO"].iloc[0]
    id_amarelo = resultado[resultado["classificacao"] == "Amarelo"]["ID_ALUNO"].iloc[0]
    id_vermelho = resultado[resultado["classificacao"] == "Vermelho"]["ID_ALUNO"].iloc[0]

    ids_exemplo = [id_verde, id_amarelo, id_vermelho]
    colunas_interesse = ["ID_ALUNO", "Idade", "tempo_de_curso", "pct_parcelas_em_aberto",
                          "media_notas", "pct_reprovacao", "total_contatos"]

    tabela_exemplos = df[df["ID_ALUNO"].isin(ids_exemplo)][colunas_interesse].merge(
        resultado[["ID_ALUNO", "score", "classificacao"]], on="ID_ALUNO"
    )
    tabela_exemplos = tabela_exemplos.set_index("ID_ALUNO").loc[ids_exemplo].reset_index()
    print(tabela_exemplos)
    return tabela_exemplos


# ---------------------------------------------------------------------------
# Bloco 11 -- Simular a chegada de 3 alunos novos (nao estao na base)
# ---------------------------------------------------------------------------
# Isso simula o uso real do modelo em producao: um aluno novo chega, voces
# preenchem os valores das features na mao, e pedem a previsao.
#
# A funcao preparar_aluno_novo cuida de aplicar os mesmos get_dummies e
# alinhar as colunas com o que o modelo espera.

def preparar_aluno_novo(dados_dict, X):
    linha = pd.DataFrame([dados_dict])
    linha["tem_bolsa"] = linha["tem_bolsa"].astype(int)
    linha = pd.get_dummies(linha, columns=CATEGORICAS)
    linha = linha.reindex(columns=X.columns, fill_value=0)
    return linha


ALUNO_A = {
    "tempo_de_curso": 1, "Idade": 19, "mora_sp_capital": 1,
    "total_parcelas": 2, "pct_parcelas_em_aberto": 0.0, "pct_parcelas_acordo": 0.0,
    "atraso_medio_dias": 0.0, "tem_bolsa": False, "valor_total_periodo": 3200.0,
    "media_notas": 85.0, "media_assiduidade": 95.0, "pct_reprovacao": 0.0,
    "tendencia_notas": 0.0, "tendencia_assiduidade": 0.0, "total_semestres": 1,
    "total_contatos": 0, "dias_desde_ultimo_contato": 999,
    "Forma de Ingresso": "Enem", "Turno": "Manhã", "Estado Civil": "Solteiro", "Sexo": "Feminino",
}

ALUNO_B = {
    "tempo_de_curso": 4, "Idade": 24, "mora_sp_capital": 0,
    "total_parcelas": 20, "pct_parcelas_em_aberto": 0.15, "pct_parcelas_acordo": 0.05,
    "atraso_medio_dias": 8.0, "tem_bolsa": True, "valor_total_periodo": 18000.0,
    "media_notas": 68.0, "media_assiduidade": 78.0, "pct_reprovacao": 0.10,
    "tendencia_notas": -5.0, "tendencia_assiduidade": -3.0, "total_semestres": 4,
    "total_contatos": 2, "dias_desde_ultimo_contato": 180,
    "Forma de Ingresso": "Vestibular", "Turno": "Noite", "Estado Civil": "Solteiro", "Sexo": "Masculino",
}

ALUNO_C = {
    "tempo_de_curso": 6, "Idade": 31, "mora_sp_capital": 0,
    "total_parcelas": 35, "pct_parcelas_em_aberto": 0.40, "pct_parcelas_acordo": 0.20,
    "atraso_medio_dias": 25.0, "tem_bolsa": False, "valor_total_periodo": 28000.0,
    "media_notas": 45.0, "media_assiduidade": 60.0, "pct_reprovacao": 0.35,
    "tendencia_notas": -18.0, "tendencia_assiduidade": -15.0, "total_semestres": 6,
    "total_contatos": 6, "dias_desde_ultimo_contato": 20,
    "Forma de Ingresso": "Transferência", "Turno": "Noite", "Estado Civil": "Casado(a)", "Sexo": "Masculino",
}


def testar_alunos_novos(rf, X):
    alunos_novos = {
        "Aluno A (calouro, tudo em dia)": ALUNO_A,
        "Aluno B (alguns atrasos, notas caindo)": ALUNO_B,
        "Aluno C (varios atrasos, reprovacoes, contatos frequentes)": ALUNO_C,
    }
    for nome, dados in alunos_novos.items():
        linha_preparada = preparar_aluno_novo(dados, X)
        prob = rf.predict_proba(linha_preparada)[0][1]
        score_novo = round(prob * 100, 1)
        print(nome)
        print("  Score (Random Forest):", score_novo, "->", classificar(score_novo))
        print()


# ---------------------------------------------------------------------------
# Bloco 12 -- Salvar os resultados (para anexar ao relatorio)
# ---------------------------------------------------------------------------

def salvar_resultados(comparacao_pct, resultado, importancias):
    comparacao_pct.to_csv("comparacao_modelos.csv")
    resultado.to_csv("scores_conjunto_teste.csv", index=False)
    importancias.to_csv("importancia_features_rf.csv", header=["importancia"])
    print("Arquivos salvos: comparacao_modelos.csv, scores_conjunto_teste.csv, importancia_features_rf.csv")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    df = carregar_base(CSV_PATH)
    X, y = preparar_features(df)
    X_train, X_test, y_train, y_test, X_train_norm, X_test_norm, scaler = dividir_e_normalizar(X, y)

    modelos = treinar_modelos(X_train, X_train_norm, y_train)
    lr, knn, dt, rf = (modelos["Regressao Logistica"], modelos["KNN (k=5)"],
                        modelos["Arvore de Decisao"], modelos["Random Forest"])

    comparacao, comparacao_pct, melhor_modelo_nome = comparar_modelos(modelos, X_test, X_test_norm, y_test)
    matriz_confusao_rf(rf, X_test, y_test)
    importancias, coeficientes = explicar_fatores(rf, lr, X)
    visualizar_arvore(dt, X)

    resultado = gerar_score(rf, df, X_test, y_test)
    exemplos_conjunto_teste(df, resultado)
    testar_alunos_novos(rf, X)

    salvar_resultados(comparacao_pct, resultado, importancias)


if __name__ == "__main__":
    main()
