# Scriptura App (Versão ACF)

Aplicativo devocional e de leitura contínua das Sagradas Escrituras na tradução **Almeida Corrigida Fiel (ACF)**, com estética sóbria e teologia reformada clássica (Monergismo).

## Funcionalidades Implementadas

1. **Leitura Exclusiva ACF:**
   - Cânon completo com 66 livros (39 do Antigo Testamento e 27 do Novo Testamento) e 31.106 versículos.
   - Navegação por livro e capítulo com modal organizado por testamentos.
   - Ajustes do leitor: tamanho da fonte, fonte com serifa/sem serifa e 3 temas de leitura (Claro, Sépia e Escuro).

2. **Sistema de Progresso Automático de Leitura:**
   - **Scroll Observer:** Rastreia quando o leitor chega ao final do capítulo.
   - **Dwell Timer:** Exige tempo mínimo de leitura (15 segundos) para garantir leitura real antes de marcar automaticamente.
   - Tabela `user_progress` com persistência local em SQLite.
   - Indicador visual e marcação manual no cabeçalho e na grade de capítulos.

3. **Destaques de Texto (Marca-texto):**
   - 5 cores oficiais: `verde`, `amarelo`, `azul`, `laranja` e `rosa`.
   - Pop-up ao tocar no versículo para aplicar cor, remover, copiar ou criar pedido de oração.
   - Tabela `user_highlights` indexada e lista geral na aba de Progresso.

4. **Aba de Devocionais Reformados:**
   - Reflexões profundas inspiradas no acervo clássico do *Monergismo* (Spurgeon, Calvino, Ryle, Owen, Edwards, Pink, Watson, Henry).
   - "Devocional do Dia" destacado e histórico de reflexões.
   - Botão para abrir instantaneamente a passagem bíblica na ACF.

5. **Mural de Orações:**
   - Organização em abas: "Ativas" e "Respondidas" com contadores.
   - Registro de pedidos pessoais, anotações de motivos e promessas bíblicas.
   - Marcação de respostas com data e celebração da graça alcançada.

6. **Perfil do Usuário e Progresso Geral:**
   - Autenticação rápida com UUID local persistido.
   - Métricas em tempo real: capítulos concluídos (1.189), percentual da Bíblia, AT e NT.
   - Edição de nome do leitor e listagem de todos os versículos destacados por cor.

## Como Executar

### 1. No Navegador (Porte Web Rápido e Leve)
```bash
./abrir_navegador.sh
# Ou inicie manualmente o servidor e acesse http://localhost:8080:
python3 web_app/server.py
```

### 2. No Flutter (Linux Desktop ou Android)
```bash
# Obter dependências
flutter pub get

# Executar no Linux Desktop nativo
flutter run -d linux

# Executar no Android (emulador ou celular conectado)
flutter run -d android
```

