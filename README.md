# Scriptura — Leitura Bíblica ACF

**Scriptura** (referência ao princípio reformador *Sola Scriptura*) é um site web de leitura bíblica em língua portuguesa na tradução **Almeida Corrigida Fiel (ACF)**, que conjuga a arquitetura de navegação e fluxos do YouVersion com a sobriedade erudita e tipográfica da **tradição Reformada calvinista de Genebra (1560)**.

---

## 🖥️ Layout Responsivo em Tela Cheia (Horizontal)

O site ocupa **100% da largura da janela**, eliminando faixas centrais estreitas ou sobras vazias em telas grandes:

- **Desktop e Tablet Largo (≥ 960px) — 3 Colunas Horizontais**:
  1. **Coluna Esquerda (Fixa, ~300px)**: Marca *Scriptura*, lema *Sola Scriptura · Genebra 1560*, navegação superior desktop (Bíblia, Buscar, Configurações, tamanho de fonte `A−`/`A+`), selo ACF, abas VT/NT, filtro de livros e catálogo canônico por categorias bíblicas.
  2. **Coluna Central (Flexível, preenche todo o espaço)**: Área de leitura contínua com largura de linha confortável (`max-width: 78ch`), letra capitular (*Drop Cap*) no versículo 1, folha de ações ao toque no versículo e tela de busca.
  3. **Coluna Direita (Fixa, ~330px)**: Painel contextual com saudação ("Graça e Paz"), contador de sequência (*Streak* 🔥), card do "Verso do Momento", "Continuar Lendo", atalhos de cânones, leituras temáticas e o banner dos Cinco Solas.
- **Tablet Estreito (600–960px) — 2 Colunas**:
  - Coluna de navegação à esquerda + conteúdo principal preenchendo o restante da janela.
- **Mobile (< 600px) — 1 Coluna**:
  - Padrão mobile em tela cheia com abas inferiores fixas no rodapé (*Início*, *Bíblia*, *Buscar*) e telas em pilha.

---

## 🌟 Recursos e Telas

### 1. Início (Home)
- **Saudação dinâmica**: Adapta-se ao horário ("Bom dia", "Boa tarde", "Boa noite") com data em português.
- **Controle de Tipografia**: Ajuste em tempo real do tamanho da fonte (`A−` e `A+`) persistido nas preferências do usuário.
- **Sequência de Leitura ("Streak")**: Contador de dias consecutivos de leitura com ícone de chama (🔥).
- **Card "Verso do Momento"**:
  - Gradiente vibrante YouVersion (`#3557E8` → `#7A3FE0` → `#B347C9`).
  - Botão **"Ler no contexto"**: abre o capítulo correspondente e rola diretamente até o versículo.
  - Botão **"Outro verso"**: sorteia e carrega dinamicamente um novo versículo.
- **Card "Continuar Lendo"**:
  - Salva automaticamente o último marcador de leitura (livro, capítulo e versículo).
  - Permite retomar a leitura com um único toque.
- **Navegação Rápida por Testamentos**: Atalhos para o Antigo Testamento (39 livros) e Novo Testamento (27 livros).
- **Carrossel de Planos em Destaque**: Planos devocionais temáticos (Paz nas Tempestades, Sabedoria Diária, A Vida de Cristo, Graça e Esperança) com pré-visualização modal.

### 2. Bíblia (Seleção de Livros e Capítulos)
- **Selo da Versão**: `ACF · Almeida Corrigida Fiel`.
- **Filtro por Testamento**: Abas separadas para o *Antigo Testamento* e *Novo Testamento*.
- **Agrupamento Canônico**: Livros organizados por categorias bíblicas (*Pentateuco*, *Históricos*, *Poéticos*, *Profetas Maiores*, *Profetas Menores*, *Evangelhos*, *Cartas Paulinas*, *Cartas Gerais*, *Profético*).
- **Busca rápida de livros**: Filtro em tempo real por nome ou abreviação (ex.: "jo", "sl", "gn").
- **Seletor de Capítulos**: Grade modal numerada para seleção direta do capítulo desejado.

### 3. Leitura (Padrão YouVersion)
- **Modo Focado sem Distrações**: Ao entrar na leitura, o dashboard (sidebar lateral, Verso do Dia e painéis) desaparece, deixando o leitor em foco imersivo.
- **Barra Superior Fixa e Mínima**:
  - Botão **"‹ Voltar"**: Retorna imediatamente ao dashboard de 3 colunas.
  - **Título Clicável**: Nome do livro e capítulo atual com chevron (ex.: *João 3*); ao clicar, abre o seletor modal de capítulos para troca rápida sem sair da leitura.
  - **Controle de Fonte**: Botões **A−** e **A+** na própria barra superior com ajuste dinâmico do tamanho tipográfico.
  - **Copiar Capítulo Completo**: Botão no topo para copiar o capítulo inteiro formatado para a área de transferência.
- **Coluna de Leitura Centralizada (~65–72ch)**:
  - O texto não é esticado de ponta a ponta em monitores largos (1920px+); mantém uma coluna de leitura confortável de largura de página de livro (~68ch), centralizada com margens suaves de pergaminho nas laterais.
  - Tipografia histórica **EB Garamond** com letra capitular (*Drop Cap*) no versículo 1 e numeração sobrescrita (`sup`).
- **Toque no Versículo & Folha de Ações (Bottom Sheet)**:
  - **4 Cores de Destaque Históricas**: Dourado Antigo, Verde Sálvia, Rosa Terracota e Azul Ardósia, além da opção de remover destaque.
  - **Marcar Página (★)**: Define o versículo como marcador atual e exibe a estrela dourada ao lado do número.
  - **Copiar Versículo**: Copia o texto e a referência formatados.
- **Navegação de Capítulos**: Botões de capítulo anterior e próximo ao final do texto delimitados por ornamento renascentista (`❧`).

### 4. Buscar
- Pesquisa de termos e palavras nas Escrituras via API ACF.
- Chips com termos teológicos sugeridos (*Graça*, *Fé*, *Amor*, *Paz*, *Salvação*, *Justiça*, *Esperança*).
- Resultados exibidos em cards com o termo em destaque (`<mark>`); toque abre a leitura no versículo específico.

### 5. Confissões & Catecismos Históricos
- Documentos clássicos da tradição reformada:
  - **Confissão de Fé de Westminster (1647)** — Cap. I: Das Sagradas Escrituras (*Sola Scriptura*).
  - **Breve Catecismo de Westminster (1648)** — Questões 1 a 10.
  - **Catecismo de Heidelberg (1563)** — Dia do Senhor 1 (O Único Consolo).
  - **Cânones de Dort (1619)** — 1º Ponto: A Eleição Incondicional da Graça.
  - **Confissão Belga (1561)** — Artigos 1 a 7: Deus e a Sagrada Escritura.
- Abertura no mesmo leitor padrão YouVersion com barra superior mínima e coluna centralizada de 68ch.

---

## 🔌 Integração de Dados & API

O texto bíblico **não é embutido fixamente no código**, sendo requisitado dinamicamente via API REST:

- **Fonte Oficial**: [A Bíblia Digital](https://www.abibliadigital.com.br/api) (Tradução `acf`).
  - `GET /books`: Catálogo de livros e metadados.
  - `GET /verses/acf/{abbrev}/{chapter}`: Texto completo do capítulo.
  - `GET /verses/acf/random`: Versículo aleatório.
  - `POST /verses/search`: Busca por palavras e expressões.
- **Resiliência e Fallback em Tempo Real**:
  - Como a infraestrutura pública gratuita da Bíblia Digital tem limite de 20 requisições/hora por IP (e pode sofrer instabilidades temporárias como HTTP 503), o aplicativo conta com um espelho público integrado em tempo real (`bible-api.com` em Almeida) e cache inteligente no `localStorage`.
  - Notificação amigável é exibida no topo caso o limite oficial seja atingido.
- **Token Opcional**: No modal de Configurações, o usuário pode inserir seu token Bearer da Bíblia Digital para requisições ilimitadas.

---

## 🎨 Identidade Visual (YouVersion Style)

- **Paleta de Cores**:
  - Fundo: `#EEF1F8`
  - Superfícies (Cards): `#FFFFFF`
  - Texto Principal: `#141C2E`
  - Texto Secundário: `#6C7689`
  - Marca / Botões: `#2E5CF0`
  - Gradiente do Verso do Dia: `#3557E8` → `#7A3FE0` → `#B347C9`
- **Tipografia**:
  - Interface / Títulos: **Plus Jakarta Sans** (600–800)
  - Leitura Bíblica: **Inter** (400–600)
- **Padrões**:
  - Mobile-first com moldura de celular centralizada em monitores desktop (`max-width: 430px`, `border-radius: 38px`, sombras suaves).
  - Ícones SVG de traço fino (sem emojis na navegação).

---

## 🚀 Como Executar Localmente

Você pode rodar localmente com qualquer servidor estático ou com Python:

```bash
# Com Python 3:
python3 -m http.server 8080

# Ou com Node.js (npx serve):
npx serve .
```

Abra no seu navegador: `http://localhost:8080`

Para publicação no **GitHub Pages**, a pasta `docs/` já está sincronizada e configurada.
