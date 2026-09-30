/**
 * SCRIPTURA APP — Lógica de Frontend Universal YouVersion Desktop & Mobile
 * Totalmente compatível com servidor local Python ou estático no GitHub Pages via bible.min.json!
 */

const state = {
  isStaticMode: false,
  staticBibleData: null,
  userId: "",
  userName: "Leitor das Escrituras",
  currentTab: "bible",
  books: [],
  currentBook: null,
  currentChapter: 1,
  verses: [],
  chapterHighlights: {},
  completedChapters: new Set(),
  theme: "light",
  fontSize: 20,
  isSerif: true,
  prayers: [],
  prayerTab: "active",
  devotionals: [],
  allHighlights: [],
  selectedColorFilter: null,

  // Rastreamento automático de leitura
  readStartTime: Date.now(),
  reachedBottom: false,
  autoCompletedDone: false,
  activeVerseForModal: null,
};

let currentTestamentTab = "at";

// Devocionais Clássicos Reformados embutidos
const STATIC_DEVOTIONALS = [
  {
    id: 1,
    date: new Date().toISOString().split("T")[0],
    title: "A Glória da Justificação Pela Fé",
    bible_reference: "Romanos 5:1",
    source_author: "Charles H. Spurgeon",
    content:
      "Sendo, pois, justificados pela fé, temos paz com Deus, por nosso Senhor Jesus Cristo.\n\nQue oceano de consolo há nesta única sentença! A paz não é uma trégua temporária, nem uma calmaria enganosa antes da tempestade; é a reconciliação definitiva e eterna selada pelo sangue do Cordeiro. O pecador que confia em Cristo não tem mais contra si qualquer acusação perante o tribunal de Deus. A lei foi satisfeita, a justiça foi vindicada e a ira de Deus foi propiciada no Calvário.\n\nÓ minh'alma, descansa na perfeita justiça de teu Redentor! Não olhes para tuas fraquezas, mas fixa os olhos nas chagas e na fidelidade de Cristo. Vivamos hoje desfrutando desta doce paz com nosso Criador e Pai.",
  },
  {
    id: 2,
    date: "2026-09-29",
    title: "O Mistério da Soberana Providência",
    bible_reference: "Romanos 8:28",
    source_author: "Thomas Watson",
    content:
      "Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.\n\nO grande Médico das almas sabe preparar a mais amarga receita para produzir a mais doce cura. Nem sempre compreendemos o propósito de nossas aflições enquanto estamos no vale, mas Deus opera soberanamente nos bastidores. As linhas escuras da tapeçaria da vida são tão necessárias para compor o belo desenho quanto os fios de ouro.\n\nNenhum fio de cabelo cai de tua cabeça sem a permissão do teu Pai celeste.",
  },
  {
    id: 3,
    date: "2026-09-28",
    title: "A Santidade Sem a Qual Ninguém Verá o Senhor",
    bible_reference: "Hebreus 12:14",
    source_author: "J.C. Ryle",
    content:
      "Segui a paz com todos, e a santificação, sem a qual ninguém verá o Senhor.\n\nA verdadeira santidade cristã não consiste em mero misticismo, tampouco em um legalismo exterior; é a semelhança real e crescente com o Senhor Jesus Cristo em caráter, palavra e ação. Um homem santo odeia o pecado e ama apaixonadamente a justiça e os mandamentos do Senhor.\n\nA graça que justifica é a mesma que purifica o coração e renova a mente.",
  },
  {
    id: 4,
    date: "2026-09-27",
    title: "A Fonte Inabalável da Graça Soberana",
    bible_reference: "Efésios 2:8-9",
    source_author: "Arthur W. Pink",
    content:
      "Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus. Não vem das obras, para que ninguém se glorie.\n\nA salvação pertence ao Senhor de ponta a ponta. Não fomos nós que escolhemos a Cristo primeiro quando estávamos mortos em delitos e pecados, mas foi Ele quem nos amou com amor eterno e nos chamou eficazmente para a Sua luz maravilhosa.\n\nOnde, pois, está a jactância humana? Excluída inteiramente!",
  },
  {
    id: 5,
    date: "2026-09-26",
    title: "A Mortificação Diária do Pecado",
    bible_reference: "Romanos 8:13",
    source_author: "John Owen",
    content:
      "Porque, se viverdes segundo a carne, morrereis; mas, se pelo Espírito mortificardes as obras do corpo, vivereis.\n\nOu estás matando o pecado diariamente, ou o pecado estará matando a ti. O crente em Cristo jamais pode declarar um cessar-fogo contra a concupiscência. Esta batalha espiritual exige vigilância constante, oração fervorosa e dependência absoluta do Espírito Santo.",
  },
  {
    id: 6,
    date: "2026-09-25",
    title: "A Luz das Escrituras Para os Nossos Passos",
    bible_reference: "Salmos 119:105",
    source_author: "João Calvino",
    content:
      "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.\n\nAssim como os viajantes na escuridão da noite tropeçam a cada passo a menos que tenham uma tocha acesa, assim toda a sabedoria humana é pura cegueira se não for iluminada pela luz límpida da Palavra Sagrada de Deus. As Escrituras são os óculos celestiais que nos permitem enxergar claramente a Deus e a nós mesmos.",
  },
  {
    id: 7,
    date: "2026-09-24",
    title: "A Doçura da Oração Matutina",
    bible_reference: "Salmos 5:3",
    source_author: "Matthew Henry",
    content:
      "Pela manhã ouvirás a minha voz, ó SENHOR; pela manhã apresentarei a ti a minha oração, e vigiarei.\n\nConsagrar as primeiras horas do dia ao nosso Criador é colocar a chave de ouro da manhã nas mãos de Deus. Antes que os ruídos do mundo invadam os nossos ouvidos, silenciemos o coração na presença dEle com reverência e fé.",
  },
];

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  initUser();
  loadSavedSettings();
  setupNavigation();
  setupScrollObserver();
  setupModals();
  setupDockActions();
  setupKeyboardShortcuts();

  await checkModeAndLoadBooks();
  await loadCurrentChapter();
  await loadUserProgress();
});

function initUser() {
  let uid = localStorage.getItem("scriptura_user_id");
  let name = localStorage.getItem("scriptura_user_name");

  if (!uid) {
    uid = "usr_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("scriptura_user_id", uid);
  }
  state.userId = uid;

  if (name) {
    state.userName = name;
  }
  const nameEl = document.getElementById("user-profile-name");
  if (nameEl) nameEl.innerText = state.userName;
  const idEl = document.getElementById("user-profile-id");
  if (idEl) idEl.innerText = state.userId;
}

function loadSavedSettings() {
  const theme = localStorage.getItem("scriptura_theme") || "light";
  applyTheme(theme);

  const fontSize = parseInt(localStorage.getItem("scriptura_font_size"), 10) || 20;
  applyFontSize(fontSize);

  const isSerif = localStorage.getItem("scriptura_is_serif") !== "false";
  applyFontFamily(isSerif);

  const savedBookId = parseInt(localStorage.getItem("scriptura_last_book_id"), 10) || 1;
  const savedChapter = parseInt(localStorage.getItem("scriptura_last_chapter"), 10) || 1;

  state.currentChapter = savedChapter;
  state.savedBookId = savedBookId;
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("scriptura_theme", theme);
}

function applyFontSize(size) {
  state.fontSize = size;
  document.documentElement.style.setProperty("--reader-font-size", size + "px");
  localStorage.setItem("scriptura_font_size", size);
}

function applyFontFamily(isSerif) {
  state.isSerif = isSerif;
  document.documentElement.style.setProperty(
    "--font-family",
    isSerif ? "Georgia, serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  );
  localStorage.setItem("scriptura_is_serif", isSerif);
}

// ==========================================
// DETECÇÃO DE MODO (LOCAL OU ESTÁTICO)
// ==========================================
async function checkModeAndLoadBooks() {
  try {
    const res = await fetch("/api/books");
    if (res.ok) {
      state.books = await res.json();
      state.isStaticMode = false;
    } else {
      throw new Error("API não disponível");
    }
  } catch (e) {
    // Modo estático (GitHub Pages / sem servidor Python)
    state.isStaticMode = true;
    console.log("Iniciando em modo estático (GitHub Pages / bible.min.json)...");
    const jsonRes = await fetch("bible.min.json");
    state.staticBibleData = await jsonRes.json();

    state.books = state.staticBibleData.map((b, index) => ({
      id: index + 1,
      order_index: index,
      abbreviation: b.a,
      name: b.n,
      testament: index < 39 ? "at" : "nt",
      chapter_count: b.c.length,
    }));
  }

  const initialBook =
    state.books.find((b) => b.id === state.savedBookId) || state.books[0];
  state.currentBook = initialBook;
}

// ==========================================
// NAVEGAÇÃO DE ABAS (DESKTOP & MOBILE)
// ==========================================
function setupNavigation() {
  // Mobile bottom nav
  const navBtns = document.querySelectorAll(".nav-item");
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Desktop top navbar
  const desktopNavBtns = document.querySelectorAll(".desktop-nav-link");
  desktopNavBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  state.currentTab = tab;

  // Atualiza botões ativos (mobile e desktop)
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".desktop-nav-link").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });

  // Alterna seções
  document.querySelectorAll(".view-section").forEach((sec) => {
    sec.classList.remove("active");
  });
  const activeSec = document.getElementById("view-" + tab);
  if (activeSec) activeSec.classList.add("active");

  closeVerseDock();

  if (tab === "bible") {
    if (state.currentBook) {
      updateChapterTitles();
    }
  } else if (tab === "devotionals") {
    loadDevotionals();
  } else if (tab === "prayers") {
    loadPrayers();
  } else if (tab === "progress") {
    loadProgressView();
  }
}
window.switchTab = switchTab;

function updateChapterTitles() {
  if (!state.currentBook) return;
  const label = document.getElementById("header-book-chap-label");
  if (label) label.innerText = `${state.currentBook.name} ${state.currentChapter}`;
  const desktopHeading = document.getElementById("desktop-chapter-title");
  if (desktopHeading) desktopHeading.innerText = `${state.currentBook.name} ${state.currentChapter}`;
}

// ==========================================
// DADOS DA BÍBLIA (ACF)
// ==========================================
async function loadCurrentChapter() {
  if (!state.currentBook) return;

  updateChapterTitles();

  localStorage.setItem("scriptura_last_book_id", state.currentBook.id);
  localStorage.setItem("scriptura_last_chapter", state.currentChapter);

  state.readStartTime = Date.now();
  state.reachedBottom = false;
  state.autoCompletedDone = false;
  closeVerseDock();

  const toast = document.getElementById("reading-completion-toast");
  if (toast) toast.classList.remove("visible");

  updateCompletionCheckmark();
  await loadChapterHighlights();

  const versesContainer = document.getElementById("verses-list");
  versesContainer.innerHTML =
    '<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:16px;">Carregando as Sagradas Escrituras...</div>';

  if (state.isStaticMode) {
    const bookIdx = state.currentBook.id - 1;
    const chapterIdx = state.currentChapter - 1;
    const rawVerses = state.staticBibleData[bookIdx]?.c[chapterIdx] || [];
    state.verses = rawVerses.map((text, i) => ({
      id: i + 1,
      number: i + 1,
      text: text,
    }));
    renderVerses();
  } else {
    try {
      const res = await fetch(
        `/api/verses?book_id=${state.currentBook.id}&chapter=${state.currentChapter}`
      );
      const data = await res.json();
      state.verses = data.verses || [];
      renderVerses();
    } catch (err) {
      versesContainer.innerHTML = `<div style="color:var(--yv-red); text-align:center; padding:30px;">Erro ao carregar versículos: ${err.message}</div>`;
    }
  }
}

function renderVerses() {
  const container = document.getElementById("verses-list");
  container.innerHTML = "";

  state.verses.forEach((v) => {
    const hlColor = state.chapterHighlights[v.number];
    const span = document.createElement("span");
    span.className = "verse-item" + (hlColor ? ` hl-${hlColor}` : "");
    span.dataset.verse = v.number;
    span.innerHTML = `<sup class="verse-num">${v.number}</sup><span class="verse-text">${v.text}</span> `;
    span.addEventListener("click", () => selectVerse(v, span));
    container.appendChild(span);
  });

  updateNavButtonsState();

  const viewsContainer = document.getElementById("views-container");
  if (viewsContainer) viewsContainer.scrollTop = 0;
}

// Atualiza o estado das setas de navegação (desktop e rodapé)
function updateNavButtonsState() {
  if (!state.currentBook || state.books.length === 0) return;

  const isFirst = state.currentBook.id === state.books[0].id && state.currentChapter === 1;
  const lastBook = state.books[state.books.length - 1];
  const isLast = state.currentBook.id === lastBook.id && state.currentChapter === lastBook.chapter_count;

  const prevBtn = document.getElementById("desktop-prev-chap");
  const nextBtn = document.getElementById("desktop-next-chap");
  if (prevBtn) prevBtn.style.opacity = isFirst ? "0.3" : "1";
  if (nextBtn) nextBtn.style.opacity = isLast ? "0.3" : "1";

  const btnPrev = document.getElementById("btn-prev-chap");
  const btnNext = document.getElementById("btn-next-chap");
  if (btnPrev) {
    btnPrev.style.visibility = isFirst ? "hidden" : "visible";
    btnPrev.innerText = state.currentChapter > 1 
      ? `← Capítulo ${state.currentChapter - 1}` 
      : `← Livro Anterior`;
  }
  if (btnNext) {
    btnNext.style.visibility = isLast ? "hidden" : "visible";
    btnNext.innerText = state.currentChapter < state.currentBook.chapter_count 
      ? `Capítulo ${state.currentChapter + 1} →` 
      : `Próximo Livro →`;
  }
}

// Navegação de capítulos contínua (estilo YouVersion Desktop)
async function goToPreviousChapter() {
  if (!state.currentBook) return;
  if (state.currentChapter > 1) {
    state.currentChapter--;
    await loadCurrentChapter();
  } else {
    const currentIdx = state.books.findIndex((b) => b.id === state.currentBook.id);
    if (currentIdx > 0) {
      const prevBook = state.books[currentIdx - 1];
      state.currentBook = prevBook;
      state.currentChapter = prevBook.chapter_count;
      await loadCurrentChapter();
    }
  }
}

async function goToNextChapter() {
  if (!state.currentBook) return;
  if (state.currentChapter < state.currentBook.chapter_count) {
    state.currentChapter++;
    await loadCurrentChapter();
  } else {
    const currentIdx = state.books.findIndex((b) => b.id === state.currentBook.id);
    if (currentIdx < state.books.length - 1) {
      const nextBook = state.books[currentIdx + 1];
      state.currentBook = nextBook;
      state.currentChapter = 1;
      await loadCurrentChapter();
    }
  }
}

// ==========================================
// FLOATING ACTION DOCK (SELEÇÃO DE VERSÍCULO YOUVERSION)
// ==========================================
function selectVerse(verse, spanEl) {
  const dock = document.getElementById("verse-action-dock");
  
  // Se clicou no mesmo versículo com o dock já visível, desmarca
  if (state.activeVerseForModal && state.activeVerseForModal.number === verse.number && dock.classList.contains("visible")) {
    closeVerseDock();
    return;
  }

  // Remove marcação anterior
  document.querySelectorAll(".verse-item.selected-verse").forEach((el) => el.classList.remove("selected-verse"));
  spanEl.classList.add("selected-verse");

  state.activeVerseForModal = verse;

  // Atualiza dock
  const refText = `${state.currentBook.name} ${state.currentChapter}:${verse.number}`;
  document.getElementById("dock-verse-ref").innerText = refText;

  const currentHl = state.chapterHighlights[verse.number];
  document.querySelectorAll(".color-dot-btn[data-color]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.color === currentHl);
  });

  const btnRemove = document.getElementById("dock-btn-remove-hl");
  if (btnRemove) {
    btnRemove.style.display = currentHl ? "flex" : "none";
  }

  dock.classList.add("visible");
}

function closeVerseDock() {
  const dock = document.getElementById("verse-action-dock");
  if (dock) dock.classList.remove("visible");
  document.querySelectorAll(".verse-item.selected-verse").forEach((el) => el.classList.remove("selected-verse"));
  state.activeVerseForModal = null;
}
window.closeVerseDock = closeVerseDock;

function setupDockActions() {
  // Cores do dock
  document.querySelectorAll(".color-dot-btn[data-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setHighlight(btn.dataset.color);
    });
  });

  // Remover destaque
  const btnRemove = document.getElementById("dock-btn-remove-hl");
  if (btnRemove) {
    btnRemove.addEventListener("click", removeHighlight);
  }

  // Copiar versículo
  const btnCopy = document.getElementById("dock-btn-copy");
  if (btnCopy) {
    btnCopy.addEventListener("click", () => {
      if (state.activeVerseForModal) {
        const text = `"${state.activeVerseForModal.text}" (${state.currentBook.name} ${state.currentChapter}:${state.activeVerseForModal.number} ACF)`;
        navigator.clipboard.writeText(text);
        
        const originalHtml = btnCopy.innerHTML;
        btnCopy.innerHTML = "<span>✓</span> <span>Copiado!</span>";
        setTimeout(() => {
          btnCopy.innerHTML = originalHtml;
          closeVerseDock();
        }, 1200);
      }
    });
  }

  // Orar com o versículo
  const btnPrayer = document.getElementById("dock-btn-prayer");
  if (btnPrayer) {
    btnPrayer.addEventListener("click", () => {
      if (state.activeVerseForModal) {
        document.getElementById("prayer-title-input").value = `Oração sobre ${state.currentBook.name} ${state.currentChapter}:${state.activeVerseForModal.number}`;
        document.getElementById("prayer-desc-input").value = `"${state.activeVerseForModal.text}"\n\nSenhor, ajuda-me a meditar e guardar esta Tua Palavra no meu coração...`;
        closeVerseDock();
        openModal("modal-new-prayer");
      }
    });
  }

  // Fechar dock
  const btnClose = document.getElementById("dock-btn-close");
  if (btnClose) {
    btnClose.addEventListener("click", closeVerseDock);
  }
}

// ==========================================
// ATALHOS DO TECLADO NO PC DESKTOP (YOUVERSION WEB)
// ==========================================
function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    if (state.currentTab !== "bible") return;
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    if (document.querySelector(".modal-overlay.active")) return;

    if (e.key === "ArrowLeft") {
      goToPreviousChapter();
    } else if (e.key === "ArrowRight") {
      goToNextChapter();
    } else if (e.key === "Escape") {
      closeVerseDock();
    }
  });
}

// ==========================================
// SCROLL OBSERVER & DWELL TIME (AUTO-COMPLEÇÃO)
// ==========================================
function setupScrollObserver() {
  const viewsContainer = document.getElementById("views-container");

  viewsContainer.addEventListener("scroll", () => {
    if (state.currentTab !== "bible" || state.autoCompletedDone) return;

    const scrollBottom =
      viewsContainer.scrollTop + viewsContainer.clientHeight >=
      viewsContainer.scrollHeight - 60;

    if (scrollBottom && !state.reachedBottom) {
      state.reachedBottom = true;
      checkAutoCompletion();
    }
  });

  setInterval(() => {
    if (state.currentTab === "bible" && !state.autoCompletedDone) {
      checkAutoCompletion();
    }
  }, 1000);
}

async function checkAutoCompletion() {
  if (state.autoCompletedDone) return;
  const elapsedSeconds = (Date.now() - state.readStartTime) / 1000;

  // Regra de Negócio: Rolagem até o fim + 15 segundos de leitura mínima
  if (state.reachedBottom && elapsedSeconds >= 15) {
    state.autoCompletedDone = true;
    await toggleChapterProgress(true);

    const toast = document.getElementById("reading-completion-toast");
    if (toast) toast.classList.add("visible");
  }
}

async function loadUserProgress() {
  if (state.isStaticMode) {
    const saved = localStorage.getItem("scriptura_progress_" + state.userId);
    const list = saved ? JSON.parse(saved) : [];
    state.completedChapters = new Set(list);
  } else {
    try {
      const res = await fetch(`/api/progress?user_id=${state.userId}`);
      const list = await res.json();
      state.completedChapters = new Set(list.map((r) => `${r.book_id}_${r.chapter}`));
    } catch (err) {
      console.error(err);
    }
  }
  updateCompletionCheckmark();
}

function updateCompletionCheckmark() {
  if (!state.currentBook) return;
  const key = `${state.currentBook.id}_${state.currentChapter}`;
  const isDone = state.completedChapters.has(key);
  const btn = document.getElementById("btn-toggle-complete");
  if (!btn) return;

  const label = btn.querySelector(".desktop-btn-label");
  const icon = btn.querySelector(".btn-check-icon");

  if (isDone) {
    btn.classList.add("completed");
    if (icon) icon.innerText = "✓";
    if (label) label.innerText = "Concluído";
    btn.title = "Capítulo Concluído (Clique para desmarcar)";
  } else {
    btn.classList.remove("completed");
    if (icon) icon.innerText = "○";
    if (label) label.innerText = "Lido";
    btn.title = "Marcar como Concluído";
  }
}

async function toggleChapterProgress(forceCompleted = false) {
  if (!state.currentBook) return;
  const key = `${state.currentBook.id}_${state.currentChapter}`;

  if (state.isStaticMode) {
    if (state.completedChapters.has(key) && !forceCompleted) {
      state.completedChapters.delete(key);
    } else {
      state.completedChapters.add(key);
    }
    localStorage.setItem(
      "scriptura_progress_" + state.userId,
      JSON.stringify(Array.from(state.completedChapters))
    );
    updateCompletionCheckmark();
  } else {
    try {
      const res = await fetch("/api/progress/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: state.userId,
          book_id: state.currentBook.id,
          chapter: state.currentChapter,
          force_completed: forceCompleted,
        }),
      });
      const result = await res.json();
      if (result.completed) {
        state.completedChapters.add(key);
      } else {
        state.completedChapters.delete(key);
      }
      updateCompletionCheckmark();
    } catch (e) {
      console.error(e);
    }
  }
}

// ==========================================
// DESTAQUES DE TEXTO (5 CORES YOUVERSION)
// ==========================================
async function loadChapterHighlights() {
  if (state.isStaticMode) {
    const key = `scriptura_hl_${state.userId}_${state.currentBook.id}_${state.currentChapter}`;
    const raw = localStorage.getItem(key);
    state.chapterHighlights = raw ? JSON.parse(raw) : {};
  } else {
    try {
      const res = await fetch(
        `/api/highlights?user_id=${state.userId}&book_id=${state.currentBook.id}&chapter=${state.currentChapter}`
      );
      const data = await res.json();
      const map = {};
      data.forEach((h) => {
        map[h.verse] = h.color;
      });
      state.chapterHighlights = map;
    } catch (e) {
      state.chapterHighlights = {};
    }
  }
}

async function setHighlight(color) {
  if (!state.activeVerseForModal) return;
  const verseNum = state.activeVerseForModal.number;

  if (state.isStaticMode) {
    state.chapterHighlights[verseNum] = color;
    const key = `scriptura_hl_${state.userId}_${state.currentBook.id}_${state.currentChapter}`;
    localStorage.setItem(key, JSON.stringify(state.chapterHighlights));

    // Salva no histórico de destaques
    let allHl = JSON.parse(localStorage.getItem("scriptura_all_hl_" + state.userId) || "[]");
    allHl = allHl.filter(
      (h) => !(h.book_id === state.currentBook.id && h.chapter === state.currentChapter && h.verse === verseNum)
    );
    allHl.unshift({
      book_id: state.currentBook.id,
      book_name: state.currentBook.name,
      chapter: state.currentChapter,
      verse: verseNum,
      verse_text: state.activeVerseForModal.text,
      color: color,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("scriptura_all_hl_" + state.userId, JSON.stringify(allHl));
  } else {
    await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: state.userId,
        book_id: state.currentBook.id,
        chapter: state.currentChapter,
        verse: verseNum,
        color: color,
      }),
    });
    state.chapterHighlights[verseNum] = color;
  }

  // Atualiza a interface
  const verseEl = document.querySelector(`.verse-item[data-verse="${verseNum}"]`);
  if (verseEl) {
    verseEl.className = `verse-item hl-${color}`;
  }
  closeVerseDock();
}

async function removeHighlight() {
  if (!state.activeVerseForModal) return;
  const verseNum = state.activeVerseForModal.number;

  if (state.isStaticMode) {
    delete state.chapterHighlights[verseNum];
    const key = `scriptura_hl_${state.userId}_${state.currentBook.id}_${state.currentChapter}`;
    localStorage.setItem(key, JSON.stringify(state.chapterHighlights));

    let allHl = JSON.parse(localStorage.getItem("scriptura_all_hl_" + state.userId) || "[]");
    allHl = allHl.filter(
      (h) => !(h.book_id === state.currentBook.id && h.chapter === state.currentChapter && h.verse === verseNum)
    );
    localStorage.setItem("scriptura_all_hl_" + state.userId, JSON.stringify(allHl));
  } else {
    await fetch("/api/highlights/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: state.userId,
        book_id: state.currentBook.id,
        chapter: state.currentChapter,
        verse: verseNum,
      }),
    });
    delete state.chapterHighlights[verseNum];
  }

  const verseEl = document.querySelector(`.verse-item[data-verse="${verseNum}"]`);
  if (verseEl) {
    verseEl.className = "verse-item";
  }
  closeVerseDock();
}

// ==========================================
// DEVOCIONAIS REFORMADOS (MONERGISMO)
// ==========================================
async function loadDevotionals() {
  if (state.isStaticMode) {
    state.devotionals = STATIC_DEVOTIONALS;
  } else {
    try {
      const res = await fetch("/api/devotionals");
      state.devotionals = await res.json();
    } catch (e) {
      state.devotionals = STATIC_DEVOTIONALS;
    }
  }
  renderDevotionals();
}

function renderDevotionals() {
  const container = document.getElementById("devotionals-feed");
  if (!container) return;
  container.innerHTML = "";

  state.devotionals.forEach((dev) => {
    const card = document.createElement("div");
    card.className = "yv-card";
    const dateFormatted = new Date(dev.date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    card.innerHTML = `
      <div class="card-date">${dateFormatted} • ${dev.source_author}</div>
      <div class="card-title">${dev.title}</div>
      <div class="passage-badge">📖 ${dev.bible_reference} (ACF)</div>
      <p style="font-size:15px; color:var(--text); line-height:1.7; white-space:pre-line; margin-bottom:20px;">${dev.content}</p>
      <button class="btn-nav primary" style="font-size:13px; padding:8px 18px;" onclick="goToPassage('${dev.bible_reference}')">
        Ler Passagem na Bíblia →
      </button>
    `;
    container.appendChild(card);
  });
}

window.goToPassage = async function (ref) {
  const parts = ref.trim().split(" ");
  if (parts.length >= 2) {
    let bName = parts[0];
    let chap = 1;
    if (parts.length > 2 && !isNaN(parseInt(parts[0], 10))) {
      bName = parts[0] + " " + parts[1];
      chap = parseInt(parts[2].split(":")[0], 10) || 1;
    } else {
      chap = parseInt(parts[1].split(":")[0], 10) || 1;
    }

    const found = state.books.find(
      (b) =>
        b.name.toLowerCase().includes(bName.toLowerCase()) ||
        bName.toLowerCase().includes(b.name.toLowerCase())
    );
    if (found) {
      state.currentBook = found;
      state.currentChapter = chap;
      switchTab("bible");
      await loadCurrentChapter();
    }
  }
};

// ==========================================
// MURAL DE ORAÇÕES
// ==========================================
async function loadPrayers() {
  if (state.isStaticMode) {
    const saved = localStorage.getItem("scriptura_prayers_" + state.userId);
    state.prayers = saved ? JSON.parse(saved) : [];
  } else {
    try {
      const res = await fetch(`/api/prayers?user_id=${state.userId}`);
      state.prayers = await res.json();
    } catch (e) {
      const saved = localStorage.getItem("scriptura_prayers_" + state.userId);
      state.prayers = saved ? JSON.parse(saved) : [];
    }
  }
  renderPrayers();
}

function renderPrayers() {
  const activeCount = state.prayers.filter((p) => p.status === "ativo").length;
  const answeredCount = state.prayers.filter((p) => p.status === "respondido").length;

  const countActive = document.getElementById("count-active-prayers");
  const countAnswered = document.getElementById("count-answered-prayers");
  if (countActive) countActive.innerText = activeCount;
  if (countAnswered) countAnswered.innerText = answeredCount;

  const container = document.getElementById("prayers-list");
  if (!container) return;
  container.innerHTML = "";

  const filtered = state.prayers.filter((p) =>
    state.prayerTab === "active" ? p.status === "ativo" : p.status === "respondido"
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:48px; color:var(--text-muted); grid-column: 1 / -1;">
        <p style="font-size:18px; font-weight:700; margin-bottom:10px;">
          ${state.prayerTab === "active" ? "Nenhuma oração ativa." : "Nenhuma oração respondida ainda."}
        </p>
        <p style="font-size:14px; max-width:440px; margin:0 auto;">"Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças." (Filipenses 4:6)</p>
      </div>
    `;
    return;
  }

  filtered.forEach((p) => {
    const card = document.createElement("div");
    card.className = "prayer-card" + (p.status === "respondido" ? " answered" : "");
    const dateStr = new Date(p.created_at).toLocaleDateString("pt-BR");
    card.innerHTML = `
      <div class="prayer-header">
        <div style="font-weight:700; font-size:16px;">${p.title}</div>
        <button class="icon-btn" style="font-size:14px; width:28px; height:28px;" onclick="deletePrayer(${p.id})">✕</button>
      </div>
      <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">${dateStr}</div>
      ${p.description ? `<p style="font-size:14px; color:var(--text); line-height:1.6; margin-bottom:14px;">${p.description}</p>` : ""}
      <div style="display:flex; justify-content:flex-end;">
        <button class="btn-nav" style="font-size:12px; padding:6px 14px;" onclick="togglePrayerStatus(${p.id}, '${p.status}')">
          ${p.status === "ativo" ? "✓ Marcar como Respondida" : "↩ Reativar Oração"}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

window.togglePrayerStatus = async function (id, currentStatus) {
  const newStatus = currentStatus === "ativo" ? "respondido" : "ativo";
  if (state.isStaticMode) {
    const p = state.prayers.find((x) => x.id === id);
    if (p) p.status = newStatus;
    localStorage.setItem("scriptura_prayers_" + state.userId, JSON.stringify(state.prayers));
  } else {
    await fetch(`/api/prayers/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }
  await loadPrayers();
};

window.deletePrayer = async function (id) {
  if (!confirm("Deseja realmente excluir este pedido de oração?")) return;

  if (state.isStaticMode) {
    state.prayers = state.prayers.filter((x) => x.id !== id);
    localStorage.setItem("scriptura_prayers_" + state.userId, JSON.stringify(state.prayers));
  } else {
    await fetch(`/api/prayers/${id}`, { method: "DELETE" });
  }
  await loadPrayers();
};

window.openNewPrayerModal = function () {
  document.getElementById("prayer-title-input").value = "";
  document.getElementById("prayer-desc-input").value = "";
  openModal("modal-new-prayer");
};

// ==========================================
// TELA DE PROGRESSO E DESTAQUES
// ==========================================
async function loadProgressView() {
  await loadUserProgress();
  await loadAllHighlights();
  renderProgressStats();
  renderAllHighlights();
}

function renderProgressStats() {
  const total = 1189;
  const otTotal = 929;
  const ntTotal = 260;

  let totalDone = state.completedChapters.size;
  let otDone = 0;
  let ntDone = 0;

  state.completedChapters.forEach((key) => {
    const bId = parseInt(key.split("_")[0], 10);
    if (bId <= 39) otDone++;
    else ntDone++;
  });

  const biblePct = Math.round((totalDone / total) * 100);
  const otPct = Math.round((otDone / otTotal) * 100);
  const ntPct = Math.round((ntDone / ntTotal) * 100);

  document.getElementById("prog-bible-pct").innerText = `${biblePct}%`;
  document.getElementById("prog-bible-bar").style.width = `${biblePct}%`;
  document.getElementById("prog-bible-text").innerText = `${totalDone} de ${total} capítulos lidos`;

  document.getElementById("prog-ot-pct").innerText = `${otPct}%`;
  document.getElementById("prog-ot-bar").style.width = `${otPct}%`;
  document.getElementById("prog-ot-text").innerText = `${otDone} de ${otTotal} capítulos`;

  document.getElementById("prog-nt-pct").innerText = `${ntPct}%`;
  document.getElementById("prog-nt-bar").style.width = `${ntPct}%`;
  document.getElementById("prog-nt-text").innerText = `${ntDone} de ${ntTotal} capítulos`;
}

async function loadAllHighlights() {
  if (state.isStaticMode) {
    const saved = localStorage.getItem("scriptura_all_hl_" + state.userId);
    state.allHighlights = saved ? JSON.parse(saved) : [];
  } else {
    try {
      const res = await fetch(`/api/highlights/all?user_id=${state.userId}`);
      state.allHighlights = await res.json();
    } catch (e) {
      state.allHighlights = [];
    }
  }
}

function renderAllHighlights() {
  const container = document.getElementById("all-highlights-list");
  if (!container) return;
  container.innerHTML = "";

  if (state.allHighlights.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:36px; color:var(--text-muted); grid-column: 1 / -1;">
        <p style="font-size:15px; font-weight:700;">Nenhum versículo destacado ainda.</p>
        <p style="font-size:13px; margin-top:4px;">Toque ou clique em qualquer versículo durante a leitura para marcá-lo com uma das 5 cores oficiais YouVersion.</p>
      </div>
    `;
    return;
  }

  state.allHighlights.forEach((h) => {
    const card = document.createElement("div");
    card.className = "yv-card";
    card.style.borderLeft = `5px solid var(--hl-${h.color})`;
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:700; font-size:15px;">${h.book_name} ${h.chapter}:${h.verse}</span>
        <span style="width:12px; height:12px; border-radius:50%; background-color:var(--hl-${h.color});"></span>
      </div>
      <p style="font-style:italic; font-size:14px; line-height:1.6; color:var(--text); margin-bottom:12px;">"${h.verse_text}"</p>
      <button class="btn-nav" style="font-size:12px; padding:6px 14px;" onclick="goToVerse(${h.book_id}, ${h.chapter}, ${h.verse})">
        Ir para Passagem →
      </button>
    `;
    container.appendChild(card);
  });
}

window.goToVerse = async function (bookId, chapter, verse) {
  const b = state.books.find((bk) => bk.id === bookId);
  if (b) {
    state.currentBook = b;
    state.currentChapter = chapter;
    switchTab("bible");
    await loadCurrentChapter();
    setTimeout(() => {
      const el = document.querySelector(`.verse-item[data-verse="${verse}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        selectVerse({ number: verse, text: el.innerText }, el);
      }
    }, 200);
  }
};

// ==========================================
// CONFIGURAÇÃO DOS MODAIS & EVENTOS
// ==========================================
function setupModals() {
  // Botão do Seletor de Livro
  document.getElementById("header-title-btn").addEventListener("click", openBookPicker);

  // Botão de Ajustes de Leitura
  document.getElementById("btn-settings").addEventListener("click", () => {
    openModal("modal-settings");
  });

  // Botão Marcar como Lido no Topo
  document.getElementById("btn-toggle-complete").addEventListener("click", () => {
    toggleChapterProgress(false);
  });

  // Setas Desktop (< e >)
  const prevDesktop = document.getElementById("desktop-prev-chap");
  if (prevDesktop) prevDesktop.addEventListener("click", goToPreviousChapter);

  const nextDesktop = document.getElementById("desktop-next-chap");
  if (nextDesktop) nextDesktop.addEventListener("click", goToNextChapter);

  // Botões de Rodapé
  document.getElementById("btn-prev-chap").addEventListener("click", goToPreviousChapter);
  document.getElementById("btn-next-chap").addEventListener("click", goToNextChapter);

  // Ajustes de Tema
  document.querySelectorAll(".theme-opt-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
  });

  // Slider de Tamanho da Fonte
  const fontSlider = document.getElementById("font-size-slider");
  fontSlider.value = state.fontSize;
  fontSlider.addEventListener("input", (e) => applyFontSize(parseInt(e.target.value, 10)));

  // Tipo de Fonte
  document.getElementById("btn-font-serif").addEventListener("click", () => applyFontFamily(true));
  document.getElementById("btn-font-sans").addEventListener("click", () => applyFontFamily(false));

  // Botão FAB Nova Oração
  const btnFab = document.getElementById("btn-new-prayer-fab");
  if (btnFab) {
    btnFab.addEventListener("click", openNewPrayerModal);
  }

  // Salvar Oração
  document.getElementById("btn-save-prayer").addEventListener("click", async () => {
    const title = document.getElementById("prayer-title-input").value.trim();
    const desc = document.getElementById("prayer-desc-input").value.trim();
    if (!title) {
      alert("Por favor, preencha o título do pedido de oração.");
      return;
    }

    if (state.isStaticMode) {
      const newP = {
        id: Date.now(),
        user_id: state.userId,
        title: title,
        description: desc,
        status: "ativo",
        created_at: new Date().toISOString(),
      };
      state.prayers.unshift(newP);
      localStorage.setItem("scriptura_prayers_" + state.userId, JSON.stringify(state.prayers));
    } else {
      await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: state.userId,
          title: title,
          description: desc,
        }),
      });
    }

    closeModal("modal-new-prayer");
    await loadPrayers();
  });

  // Abas de Oração (Ativas / Respondidas)
  document.getElementById("tab-active-prayers").addEventListener("click", () => {
    state.prayerTab = "active";
    document.getElementById("tab-active-prayers").classList.add("active");
    document.getElementById("tab-answered-prayers").classList.remove("active");
    renderPrayers();
  });

  document.getElementById("tab-answered-prayers").addEventListener("click", () => {
    state.prayerTab = "answered";
    document.getElementById("tab-answered-prayers").classList.add("active");
    document.getElementById("tab-active-prayers").classList.remove("active");
    renderPrayers();
  });

  // Fechar modais ao clicar no fundo
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });

  // Editar Nome de Leitor
  const btnEditName = document.getElementById("btn-edit-name");
  if (btnEditName) {
    btnEditName.addEventListener("click", () => {
      const newName = prompt("Digite seu nome de leitor:", state.userName);
      if (newName && newName.trim()) {
        state.userName = newName.trim();
        localStorage.setItem("scriptura_user_name", state.userName);
        document.getElementById("user-profile-name").innerText = state.userName;
      }
    });
  }

  // Filtro de busca de livros em tempo real
  const searchInput = document.getElementById("book-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      renderBookPickerBooks(currentTestamentTab, term);
    });
  }
}

// ==========================================
// SELETOR DE LIVROS & CAPÍTULOS
// ==========================================
function openBookPicker() {
  const searchInput = document.getElementById("book-search-input");
  if (searchInput) searchInput.value = "";
  const backBtn = document.getElementById("btn-back-to-books");
  if (backBtn) backBtn.style.display = "none";
  const tabs = document.getElementById("picker-testament-tabs");
  if (tabs) tabs.style.display = "flex";
  const searchWrap = document.getElementById("picker-search-container");
  if (searchWrap) searchWrap.style.display = "block";

  renderBookPickerBooks(currentTestamentTab);
  openModal("modal-book-picker");
}

function renderBookPickerBooks(testament, filterTerm = "") {
  currentTestamentTab = testament;
  document.getElementById("book-picker-title").innerText = "Selecionar Livro";
  const backBtn = document.getElementById("btn-back-to-books");
  if (backBtn) backBtn.style.display = "none";
  const tabs = document.getElementById("picker-testament-tabs");
  if (tabs) tabs.style.display = "flex";

  const container = document.getElementById("book-picker-list");
  container.innerHTML = "";

  let booksToDisplay = state.books.filter((b) => b.testament === testament);
  if (filterTerm) {
    booksToDisplay = state.books.filter(
      (b) =>
        b.name.toLowerCase().includes(filterTerm) ||
        b.abbreviation.toLowerCase().includes(filterTerm)
    );
  }

  if (booksToDisplay.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-muted);">Nenhum livro encontrado para "${filterTerm}".</div>`;
    return;
  }

  booksToDisplay.forEach((b) => {
    let completedCount = 0;
    for (let c = 1; c <= b.chapter_count; c++) {
      if (state.completedChapters.has(`${b.id}_${c}`)) completedCount++;
    }

    const item = document.createElement("div");
    item.style.padding = "14px 16px";
    item.style.borderBottom = "1px solid var(--border)";
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";
    item.style.cursor = "pointer";
    item.style.transition = "background-color 0.15s";

    item.onmouseenter = () => (item.style.backgroundColor = "var(--surface-hover)");
    item.onmouseleave = () => (item.style.backgroundColor = "transparent");

    item.innerHTML = `
      <div>
        <div style="font-weight:700; font-size:16px;">${b.name}</div>
        <div style="font-size:12px; color:var(--text-muted);">${b.chapter_count} capítulos</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${
          completedCount > 0
            ? `<span style="background:rgba(16,185,129,0.15); color:#047857; font-size:12px; font-weight:bold; padding:2px 8px; border-radius:10px;">${completedCount}/${b.chapter_count} ✓</span>`
            : ""
        }
        <span style="color:var(--text-muted); font-size:18px;">›</span>
      </div>
    `;

    item.addEventListener("click", () => renderChapterGrid(b));
    container.appendChild(item);
  });
}

window.selectTestamentTab = function (testament) {
  document.getElementById("tab-ot-btn").classList.toggle("active", testament === "at");
  document.getElementById("tab-nt-btn").classList.toggle("active", testament === "nt");
  renderBookPickerBooks(testament);
};

function renderChapterGrid(book) {
  document.getElementById("book-picker-title").innerText = `${book.name}`;
  const backBtn = document.getElementById("btn-back-to-books");
  if (backBtn) backBtn.style.display = "inline-flex";
  const tabs = document.getElementById("picker-testament-tabs");
  if (tabs) tabs.style.display = "none";
  const searchWrap = document.getElementById("picker-search-container");
  if (searchWrap) searchWrap.style.display = "none";

  const container = document.getElementById("book-picker-list");
  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap:10px; padding:16px 0;">
      ${Array.from({ length: book.chapter_count }, (_, i) => i + 1)
        .map((chap) => {
          const isDone = state.completedChapters.has(`${book.id}_${chap}`);
          const isCurrent = state.currentBook.id === book.id && state.currentChapter === chap;
          return `
            <button onclick="pickChapter(${book.id}, ${chap})" style="
              aspect-ratio: 1;
              font-size: 15px;
              font-weight: 800;
              border-radius: 10px;
              border: 1px solid ${isCurrent ? "var(--yv-red)" : isDone ? "#10b981" : "var(--border)"};
              background: ${isCurrent ? "var(--yv-red)" : isDone ? "rgba(16,185,129,0.12)" : "var(--surface)"};
              color: ${isCurrent ? "#ffffff" : isDone ? "#047857" : "var(--text)"};
              cursor: pointer;
              transition: transform 0.1s;
            ">
              ${chap}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

window.backToBookList = function () {
  const searchWrap = document.getElementById("picker-search-container");
  if (searchWrap) searchWrap.style.display = "block";
  renderBookPickerBooks(currentTestamentTab);
};

window.pickChapter = function (bookId, chapter) {
  const b = state.books.find((bk) => bk.id === bookId);
  if (b) {
    state.currentBook = b;
    state.currentChapter = chapter;
    closeModal("modal-book-picker");
    loadCurrentChapter();
  }
};

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("active");
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("active");
}
window.closeModal = closeModal;
