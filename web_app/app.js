/**
 * SCRIPTURA APP — Lógica de Frontend Universal (Local & GitHub Pages)
 * Funciona conectado à API local ou de forma 100% estática via bible.min.json no GitHub Pages!
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
  fontSize: 19,
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

// Devocionais embutidos para modo estático (GitHub Pages)
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

  await checkModeAndLoadBooks();
  await loadCurrentChapter();
  await loadUserProgress();
});

function initUser() {
  let uid = localStorage.getItem("scriptura_user_id");
  let name = localStorage.getItem("scriptura_user_name");

  if (!uid) {
    uid = "user-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
    localStorage.setItem("scriptura_user_id", uid);
  }
  if (!name) {
    name = "Leitor das Escrituras";
    localStorage.setItem("scriptura_user_name", name);
  }

  state.userId = uid;
  state.userName = name;
}

function loadSavedSettings() {
  const savedTheme = localStorage.getItem("scriptura_theme") || "light";
  const savedFontSize = parseInt(localStorage.getItem("scriptura_font_size") || "19", 10);
  const savedSerif = localStorage.getItem("scriptura_is_serif") !== "false";

  const savedBookId = parseInt(localStorage.getItem("scriptura_last_book_id") || "1", 10);
  const savedChapter = parseInt(localStorage.getItem("scriptura_last_chapter") || "1", 10);

  state.theme = savedTheme;
  state.fontSize = savedFontSize;
  state.isSerif = savedSerif;
  state.currentChapter = savedChapter;

  applyTheme(savedTheme);
  applyFontSize(savedFontSize);
  applyFontFamily(savedSerif);

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
    isSerif ? "Georgia, serif" : "-apple-system, sans-serif"
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
    // Modo estático (GitHub Pages / sem servidor)
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
// NAVEGAÇÃO DE ABAS
// ==========================================
function setupNavigation() {
  const navBtns = document.querySelectorAll(".nav-item");
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".view-section").forEach((sec) => {
    sec.classList.remove("active");
  });
  const activeSec = document.getElementById("view-" + tab);
  if (activeSec) activeSec.classList.add("active");

  const headerTitle = document.getElementById("header-title-btn");
  if (tab === "bible") {
    if (state.currentBook) {
      headerTitle.innerHTML = `<span>${state.currentBook.name} ${state.currentChapter}</span> <span style="font-size:12px;">▾</span>`;
    }
  } else if (tab === "devotionals") {
    headerTitle.innerHTML = `<span>Devocionais Reformados</span>`;
    loadDevotionals();
  } else if (tab === "prayers") {
    headerTitle.innerHTML = `<span>Mural de Orações</span>`;
    loadPrayers();
  } else if (tab === "progress") {
    headerTitle.innerHTML = `<span>Progresso & Destaques</span>`;
    loadProgressView();
  }
}

// ==========================================
// DADOS DA BÍBLIA (ACF)
// ==========================================
async function loadCurrentChapter() {
  if (!state.currentBook) return;

  const headerTitle = document.getElementById("header-title-btn");
  headerTitle.innerHTML = `<span>${state.currentBook.name} ${state.currentChapter}</span> <span style="font-size:12px;">▾</span>`;

  localStorage.setItem("scriptura_last_book_id", state.currentBook.id);
  localStorage.setItem("scriptura_last_chapter", state.currentChapter);

  state.readStartTime = Date.now();
  state.reachedBottom = false;
  state.autoCompletedDone = false;
  document.getElementById("reading-completion-toast").classList.remove("visible");

  updateCompletionCheckmark();
  await loadChapterHighlights();

  const versesContainer = document.getElementById("verses-list");
  versesContainer.innerHTML =
    '<div style="text-align:center; padding:30px; color:gray;">Carregando Escrituras...</div>';

  if (state.isStaticMode) {
    const bookIdx = state.currentBook.id - 1;
    const chapterIdx = state.currentChapter - 1;
    const rawVerses = state.staticBibleData[bookIdx].c[chapterIdx] || [];
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
      versesContainer.innerHTML = `<div style="color:red; text-align:center;">Erro ao carregar versículos: ${err.message}</div>`;
    }
  }
}

function renderVerses() {
  const container = document.getElementById("verses-list");
  container.innerHTML = "";

  state.verses.forEach((v) => {
    const hlColor = state.chapterHighlights[v.number];
    const div = document.createElement("div");
    div.className = "verse-item" + (hlColor ? ` hl-${hlColor}` : "");
    div.dataset.verse = v.number;
    div.innerHTML = `<span class="verse-num">${v.number}</span><span class="verse-text">${v.text}</span>`;
    div.addEventListener("click", () => openHighlightModal(v));
    container.appendChild(div);
  });

  const btnPrev = document.getElementById("btn-prev-chap");
  const btnNext = document.getElementById("btn-next-chap");

  if (state.currentChapter > 1) {
    btnPrev.style.visibility = "visible";
    btnPrev.innerText = `← Capítulo ${state.currentChapter - 1}`;
  } else {
    btnPrev.style.visibility = "hidden";
  }

  if (state.currentChapter < state.currentBook.chapter_count) {
    btnNext.style.visibility = "visible";
    btnNext.innerText = `Capítulo ${state.currentChapter + 1} →`;
  } else {
    btnNext.style.visibility = "hidden";
  }

  const viewsContainer = document.getElementById("views-container");
  viewsContainer.scrollTop = 0;
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
    toast.classList.add("visible");
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
  if (isDone) {
    btn.classList.add("completed");
    btn.innerHTML = "✓";
    btn.title = "Capítulo Concluído";
  } else {
    btn.classList.remove("completed");
    btn.innerHTML = "○";
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
// DESTAQUES DE TEXTO (5 CORES)
// ==========================================
async function loadChapterHighlights() {
  if (state.isStaticMode) {
    const key = `scriptura_hl_${state.userId}_${state.currentBook.id}_${state.currentChapter}`;
    const saved = localStorage.getItem(key);
    state.chapterHighlights = saved ? JSON.parse(saved) : {};
  } else {
    try {
      const res = await fetch(
        `/api/highlights?user_id=${state.userId}&book_id=${state.currentBook.id}&chapter=${state.currentChapter}`
      );
      state.chapterHighlights = await res.json();
    } catch (e) {
      state.chapterHighlights = {};
    }
  }
}

function openHighlightModal(verse) {
  state.activeVerseForModal = verse;
  const currentHl = state.chapterHighlights[verse.number];

  document.getElementById("modal-hl-ref").innerText =
    `${state.currentBook.name} ${state.currentChapter}:${verse.number}`;
  document.getElementById("modal-hl-text").innerText = `"${verse.text}"`;

  document.querySelectorAll(".color-circle-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.color === currentHl);
  });

  const btnRemove = document.getElementById("btn-modal-remove-hl");
  btnRemove.style.display = currentHl ? "block" : "none";

  openModal("modal-highlight");
}

async function setHighlight(color) {
  if (!state.activeVerseForModal) return;
  const verseNum = state.activeVerseForModal.number;

  if (state.isStaticMode) {
    state.chapterHighlights[verseNum] = color;
    const key = `scriptura_hl_${state.userId}_${state.currentBook.id}_${state.currentChapter}`;
    localStorage.setItem(key, JSON.stringify(state.chapterHighlights));

    // Salva no registro geral de destaques
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

  renderVerses();
  closeModal("modal-highlight");
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

  renderVerses();
  closeModal("modal-highlight");
}

// ==========================================
// DEVOCIONAIS (MONERGISMO)
// ==========================================
async function loadDevotionals() {
  const container = document.getElementById("devotionals-feed");
  if (state.isStaticMode) {
    state.devotionals = STATIC_DEVOTIONALS;
    renderDevotionals();
  } else {
    try {
      const res = await fetch("/api/devotionals");
      state.devotionals = await res.json();
      renderDevotionals();
    } catch (e) {
      state.devotionals = STATIC_DEVOTIONALS;
      renderDevotionals();
    }
  }
}

function renderDevotionals() {
  const container = document.getElementById("devotionals-feed");
  container.innerHTML = "";

  state.devotionals.forEach((dev) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:12px; font-weight:600; color:var(--primary);">${dev.date}</span>
        <span style="font-size:12px; color:var(--text-muted); font-style:italic;">${dev.source_author || "Autor Reformado"}</span>
      </div>
      <div class="card-title">${dev.title}</div>
      <div class="passage-badge">📖 ${dev.bible_reference} (ACF)</div>
      <p style="font-size:14px; color:var(--text); line-height:1.6; white-space:pre-line; margin-bottom:16px;">${dev.content}</p>
      <button class="btn-nav primary" style="font-size:13px; padding:6px 14px;" onclick="goToPassage('${dev.bible_reference}')">
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

  document.getElementById("count-active-prayers").innerText = activeCount;
  document.getElementById("count-answered-prayers").innerText = answeredCount;

  const container = document.getElementById("prayers-list");
  container.innerHTML = "";

  const filtered = state.prayers.filter((p) =>
    state.prayerTab === "active" ? p.status === "ativo" : p.status === "respondido"
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--text-muted);">
        <p style="font-size:16px; font-weight:bold; margin-bottom:8px;">
          ${state.prayerTab === "active" ? "Nenhuma oração ativa." : "Nenhuma oração respondida ainda."}
        </p>
        <p style="font-size:13px;">"Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco." (1 Ts 5:18)</p>
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
        <div style="font-weight:bold; font-size:16px;">${p.title}</div>
        <button class="icon-btn" style="font-size:14px; width:28px; height:28px;" onclick="deletePrayer(${p.id})">✕</button>
      </div>
      ${p.description ? `<p style="font-size:14px; color:var(--text-muted); margin-bottom:12px; line-height:1.5;">${p.description}</p>` : ""}
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-muted);">
        <span>Criada em: ${dateStr}</span>
        ${
          p.status === "ativo"
            ? `<button class="btn-nav" style="padding:4px 10px; font-size:12px; background:#d1fae5; color:#065f46; border:none;" onclick="markAnswered(${p.id})">Respondida! ✓</button>`
            : `<button class="btn-nav" style="padding:4px 10px; font-size:12px;" onclick="reopenPrayer(${p.id})">Reativar</button>`
        }
      </div>
    `;
    container.appendChild(card);
  });
}

window.markAnswered = async function (id) {
  if (state.isStaticMode) {
    state.prayers = state.prayers.map((p) =>
      p.id === id ? { ...p, status: "respondido", answered_at: new Date().toISOString() } : p
    );
    localStorage.setItem("scriptura_prayers_" + state.userId, JSON.stringify(state.prayers));
  } else {
    await fetch("/api/prayers/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }
  await loadPrayers();
};

window.reopenPrayer = async function (id) {
  if (state.isStaticMode) {
    state.prayers = state.prayers.map((p) =>
      p.id === id ? { ...p, status: "ativo", answered_at: null } : p
    );
    localStorage.setItem("scriptura_prayers_" + state.userId, JSON.stringify(state.prayers));
  } else {
    await fetch("/api/prayers/reopen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }
  await loadPrayers();
};

window.deletePrayer = async function (id) {
  if (confirm("Deseja realmente excluir este pedido de oração?")) {
    if (state.isStaticMode) {
      state.prayers = state.prayers.filter((p) => p.id !== id);
      localStorage.setItem("scriptura_prayers_" + state.userId, JSON.stringify(state.prayers));
    } else {
      await fetch("/api/prayers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }
    await loadPrayers();
  }
};

// ==========================================
// PROGRESSO & DESTAQUES VIEW
// ==========================================
async function loadProgressView() {
  document.getElementById("user-profile-name").innerText = state.userName;
  document.getElementById("user-profile-id").innerText = state.userId.substring(0, 14) + "...";

  const totalCompleted = state.completedChapters.size;
  let otCompleted = 0;
  let ntCompleted = 0;

  state.completedChapters.forEach((k) => {
    const bId = parseInt(k.split("_")[0], 10);
    if (bId <= 39) otCompleted++;
    else ntCompleted++;
  });

  const biblePct = ((totalCompleted / 1189) * 100).toFixed(1);
  const otPct = ((otCompleted / 929) * 100).toFixed(1);
  const ntPct = ((ntCompleted / 260) * 100).toFixed(1);

  document.getElementById("prog-bible-pct").innerText = biblePct + "%";
  document.getElementById("prog-bible-text").innerText = `${totalCompleted} de 1.189 capítulos`;
  document.getElementById("prog-bible-bar").style.width = biblePct + "%";

  document.getElementById("prog-ot-pct").innerText = otPct + "%";
  document.getElementById("prog-ot-text").innerText = `${otCompleted} de 929 capítulos`;
  document.getElementById("prog-ot-bar").style.width = otPct + "%";

  document.getElementById("prog-nt-pct").innerText = ntPct + "%";
  document.getElementById("prog-nt-text").innerText = `${ntCompleted} de 260 capítulos`;
  document.getElementById("prog-nt-bar").style.width = ntPct + "%";

  if (state.isStaticMode) {
    const saved = localStorage.getItem("scriptura_all_hl_" + state.userId);
    state.allHighlights = saved ? JSON.parse(saved) : [];
  } else {
    try {
      const res = await fetch(`/api/highlights?user_id=${state.userId}`);
      state.allHighlights = await res.json();
    } catch (e) {
      const saved = localStorage.getItem("scriptura_all_hl_" + state.userId);
      state.allHighlights = saved ? JSON.parse(saved) : [];
    }
  }
  renderAllHighlights();
}

function renderAllHighlights() {
  const container = document.getElementById("all-highlights-list");
  container.innerHTML = "";

  const filtered = state.selectedColorFilter
    ? state.allHighlights.filter((h) => h.color === state.selectedColorFilter)
    : state.allHighlights;

  if (filtered.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:20px; color:var(--text-muted);">Nenhum versículo destacado encontrado.</div>';
    return;
  }

  filtered.forEach((h) => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.padding = "12px 16px";
    div.style.marginBottom = "8px";
    div.style.cursor = "pointer";
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-weight:bold; font-size:15px; color:var(--primary);">${h.book_name} ${h.chapter}:${h.verse}</span>
        <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:var(--hl-${h.color}); border:1px solid var(--border);"></span>
      </div>
      <p style="font-size:14px; font-style:italic; color:var(--text); line-height:1.4;">"${h.verse_text || ""}"</p>
    `;
    div.addEventListener("click", () => {
      const b = state.books.find((bk) => bk.id === h.book_id);
      if (b) {
        state.currentBook = b;
        state.currentChapter = h.chapter;
        switchTab("bible");
        loadCurrentChapter();
      }
    });
    container.appendChild(div);
  });
}

// ==========================================
// MODAIS & SELETOR DE LIVROS
// ==========================================
function setupModals() {
  document.getElementById("header-title-btn").addEventListener("click", () => {
    if (state.currentTab === "bible") {
      openBookPicker();
    }
  });

  document.getElementById("btn-settings").addEventListener("click", () => {
    openModal("modal-settings");
  });

  document.getElementById("btn-toggle-complete").addEventListener("click", () => {
    toggleChapterProgress(false);
  });

  document.getElementById("btn-prev-chap").addEventListener("click", () => {
    if (state.currentChapter > 1) {
      state.currentChapter--;
      loadCurrentChapter();
    }
  });
  document.getElementById("btn-next-chap").addEventListener("click", () => {
    if (state.currentChapter < state.currentBook.chapter_count) {
      state.currentChapter++;
      loadCurrentChapter();
    }
  });

  document.querySelectorAll(".theme-opt-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
  });

  const fontSlider = document.getElementById("font-size-slider");
  fontSlider.value = state.fontSize;
  fontSlider.addEventListener("input", (e) => applyFontSize(parseInt(e.target.value, 10)));

  document.getElementById("btn-font-serif").addEventListener("click", () => applyFontFamily(true));
  document.getElementById("btn-font-sans").addEventListener("click", () => applyFontFamily(false));

  document.querySelectorAll(".color-circle-btn").forEach((btn) => {
    btn.addEventListener("click", () => setHighlight(btn.dataset.color));
  });

  document.getElementById("btn-modal-remove-hl").addEventListener("click", removeHighlight);

  document.getElementById("btn-modal-copy-verse").addEventListener("click", () => {
    if (state.activeVerseForModal) {
      const text = `"${state.activeVerseForModal.text}" (${state.currentBook.name} ${state.currentChapter}:${state.activeVerseForModal.number} ACF)`;
      navigator.clipboard.writeText(text);
      alert("Versículo copiado!");
      closeModal("modal-highlight");
    }
  });

  document.getElementById("btn-new-prayer-fab").addEventListener("click", () => {
    document.getElementById("prayer-title-input").value = "";
    document.getElementById("prayer-desc-input").value = "";
    openModal("modal-new-prayer");
  });

  document.getElementById("btn-save-prayer").addEventListener("click", async () => {
    const title = document.getElementById("prayer-title-input").value.trim();
    const desc = document.getElementById("prayer-desc-input").value.trim();
    if (!title) {
      alert("Por favor, preencha o título do pedido.");
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

  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });

  document.getElementById("btn-edit-name").addEventListener("click", () => {
    const newName = prompt("Digite seu nome de leitor:", state.userName);
    if (newName && newName.trim()) {
      state.userName = newName.trim();
      localStorage.setItem("scriptura_user_name", state.userName);
      document.getElementById("user-profile-name").innerText = state.userName;
    }
  });
}

function openBookPicker() {
  renderBookPickerBooks("at");
  openModal("modal-book-picker");
}

function renderBookPickerBooks(testament) {
  const container = document.getElementById("book-picker-list");
  container.innerHTML = "";

  const booksToDisplay = state.books.filter((b) => b.testament === testament);

  booksToDisplay.forEach((b) => {
    let completedCount = 0;
    for (let c = 1; c <= b.chapter_count; c++) {
      if (state.completedChapters.has(`${b.id}_${c}`)) completedCount++;
    }

    const item = document.createElement("div");
    item.style.padding = "12px 16px";
    item.style.borderBottom = "1px solid var(--border)";
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";
    item.style.cursor = "pointer";

    item.innerHTML = `
      <div>
        <div style="font-weight:600; font-size:16px;">${b.name}</div>
        <div style="font-size:12px; color:var(--text-muted);">${b.chapter_count} capítulos</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${completedCount > 0 ? `<span style="background:rgba(16,185,129,0.15); color:#047857; font-size:12px; font-weight:bold; padding:2px 8px; border-radius:10px;">${completedCount}/${b.chapter_count} ✓</span>` : ""}
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
  document.getElementById("book-picker-title").innerText = "Selecionar Livro";
  renderBookPickerBooks(testament);
};

function renderChapterGrid(book) {
  document.getElementById("book-picker-title").innerText = `${book.name} — Capítulos`;
  const container = document.getElementById("book-picker-list");
  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:10px; padding:16px 0;">
      ${Array.from({ length: book.chapter_count }, (_, i) => i + 1)
        .map((chap) => {
          const isDone = state.completedChapters.has(`${book.id}_${chap}`);
          const isCurrent = state.currentBook.id === book.id && state.currentChapter === chap;
          return `
            <button onclick="pickChapter(${book.id}, ${chap})" style="
              aspect-ratio: 1.1;
              font-size: 16px;
              font-weight: bold;
              border-radius: 8px;
              border: 1px solid ${isCurrent ? "var(--primary)" : isDone ? "#10b981" : "var(--border)"};
              background: ${isCurrent ? "var(--primary)" : isDone ? "#d1fae5" : "var(--surface)"};
              color: ${isCurrent ? "#ffffff" : isDone ? "#065f46" : "var(--text)"};
              cursor: pointer;
            ">
              ${chap} ${isDone && !isCurrent ? '<span style="font-size:10px;">✓</span>' : ""}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

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
