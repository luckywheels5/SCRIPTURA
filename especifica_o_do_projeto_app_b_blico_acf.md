# Especificação do Aplicativo Bíblico (Versão ACF)

Este documento reúne a arquitetura, regras de negócio e modelagem de banco de dados para a construção de um aplicativo de leitura e estudo devocional das Escrituras, utilizando exclusivamente a tradução **Almeida Corrigida Fiel (ACF)**.

---

## 1. Visão Geral das Funcionalidades

1. **Leitura Exclusiva ACF:** O texto sagrado é apresentado estritamente na versão ACF, garantindo fidelidade textual.
2. **Sistema de Progresso de Leitura:** Rastreamento automático de capítulos concluídos com base no término da rolagem e tempo mínimo de permanência na página.
3. **Destaques de Texto:** Ferramenta para selecionar trechos dos versículos e marcá-los com cinco cores: `verde`, `amarelo`, `azul`, `laranja` e `rosa`.
4. **Aba de Devocionais:** Reflexões diárias baseadas ou inspiradas no acervo do *Monergismo*, vinculadas a uma passagem bíblica base em ACF.
5. **Aba de Orações:** Espaço para o usuário gerenciar seus pedidos de oração pessoais com opções de marcar como ativos ou respondidos.

---

## 2. Modelagem do Banco de Dados (SQL)

As tabelas essenciais para estruturar o backend do aplicativo:

```sql
-- 1. Controle de Progresso de Leitura por Capítulo
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    book_id INT NOT NULL,
    chapter INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id, chapter)
);

-- 2. Sistema de Destaques em Cores
CREATE TABLE user_highlights (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    book_id INT NOT NULL,
    chapter INT NOT NULL,
    verse INT NOT NULL,
    start_offset INT NOT NULL,
    end_offset INT NOT NULL,
    color VARCHAR(20) NOT NULL CHECK (color IN ('verde', 'amarelo', 'azul', 'laranja', 'rosa')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Acervo de Devocionais (Inspiração Monergismo)
CREATE TABLE devotionals (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    bible_reference VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    source_author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Mural de Orações do Usuário
CREATE TABLE user_prayers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'respondido')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP
);
```

---

## 3. Próximos Passos de Desenvolvimento

- [x] Configuração do ambiente e autenticação rápida por usuário.
- [x] Implementação da tela de leitura com renderização do texto ACF.
- [x] Desenvolvimento da lógica do observador de rolagem (Scroll Observer) para o progresso.
- [x] Criação do pop-up de seleção de texto para os destaques coloridos.
- [x] Aba de Devocionais reformados (acervo Monergismo) e integração com a leitura ACF.
- [x] Mural de Orações do usuário (ativas e respondidas).