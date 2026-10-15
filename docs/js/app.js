/**
 * SCRIPTURA — Leitura Bíblica (Sola Scriptura · ACF)
 * Controlador Principal da Interface, Navegação e Interações
 */

// Estado interno do App
let currentBookObj = null;
let currentChapterNum = 1;
let currentSelectedVerse = null;
let currentVerseText = '';
let currentVerseRef = '';
let currentVerseDayData = null;
let booksList = [];
let searchDebounceTimeout = null;

// Planos de Leitura para o Carrossel (Temas Reformados de Genebra)
const FEATURED_PLANS = {
  1: {
    title: 'Os Salmos de Genebra',
    duration: '7 Dias',
    desc: 'Meditações profundas nos Salmos metrificados e hinos de exílio da tradição reformada, revelando consolo e soberania divina.',
    startBook: 'sl',
    startChap: 23
  },
  2: {
    title: 'A Sabedoria dos Provérbios',
    duration: '31 Dias',
    desc: 'Um capítulo diário de Provérbios com a sobriedade erudita de Genebra para cultivar retidão, prudência e temor ao Senhor.',
    startBook: 'pv',
    startChap: 1
  },
  3: {
    title: 'A Soberania da Graça',
    duration: '14 Dias',
    desc: 'Estudo nas epístolas aos Romanos e Efésios sobre os fundamentos inabaláveis da Sola Gratia e Sola Fide.',
    startBook: 'rm',
    startChap: 8
  },
  4: {
    title: 'A Vida de Cristo (Evangelhos)',
    duration: '30 Dias',
    desc: 'O testemunho unificado dos quatro Evangelhos acerca de Cristo, o único Mediador (Solus Christus).',
    startBook: 'jo',
    startChap: 1
  }
};

// ==========================================================================
// INICIALIZAÇÃO DO APP
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initDateAndGreeting();
  initFontSize();
  initStreak();
  initNavigation();
  initTopbarControls();
  renderSidebarRecents();
  initVerseOfTheDay();
  initContinueReadingCard();
  initShortcuts();
  initFeaturedPlans();
  initBibleScreen();
  initConfessionsScreen();
  initReaderControls();
  initSearchScreen();
  initVerseActionSheet();
  initModals();
  initApiStatusListener();
  initHeroActions();
  initAuthUI();

  // Carrega a lista de livros em segundo plano
  try {
    booksList = await window.bibleApi.getBooks();
    renderBibleBooks();
  } catch (err) {
    console.error('Erro ao carregar livros da Bíblia:', err);
  }

  // Inicialização padrão: inicia no Dashboard (Home), exibindo o layout completo
  switchScreen('home');
});

// ==========================================================================
// CABEÇALHO, SAUDAÇÃO & CONFIGURAÇÕES DE FONTE
// ==========================================================================
function initDateAndGreeting() {
  const greetingEl = document.getElementById('greeting-text');
  const dateEl = document.getElementById('current-date-text');

  const now = new Date();
  const hour = now.getHours();
  let greeting = 'Graça e Paz 👋';
  if (hour >= 5 && hour < 12) greeting = 'Graça e Paz ☀️';
  else if (hour >= 12 && hour < 18) greeting = 'Graça e Paz 🌤️';
  else greeting = 'Graça e Paz 🌙';

  if (greetingEl) greetingEl.textContent = greeting;

  // Formatação de data em português com o nome oficial Scriptura
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const formattedDate = now.toLocaleDateString('pt-BR', options);
  if (dateEl) {
    dateEl.textContent = `Scriptura · ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`;
  }
}

function initFontSize() {
  const currentSize = window.appState.fontSize;
  document.documentElement.style.setProperty('--reader-font-size', `${currentSize}px`);

  const btnDec = document.getElementById('btn-font-dec');
  const btnInc = document.getElementById('btn-font-inc');

  if (btnDec) {
    btnDec.addEventListener('click', () => {
      const newSize = window.appState.adjustFontSize(-1);
      document.documentElement.style.setProperty('--reader-font-size', `${newSize}px`);
      showToast(`Fonte: ${newSize}px`);
    });
  }

  if (btnInc) {
    btnInc.addEventListener('click', () => {
      const newSize = window.appState.adjustFontSize(1);
      document.documentElement.style.setProperty('--reader-font-size', `${newSize}px`);
      showToast(`Fonte: ${newSize}px`);
    });
  }
}

function initStreak() {
  const streakEl = document.getElementById('streak-count');
  if (streakEl && window.appState.streak) {
    streakEl.textContent = window.appState.streak.count || 1;
  }
}

// ==========================================================================
// SISTEMA DE NAVEGAÇÃO POR ABAS (DESKTOP & MOBILE)
// ==========================================================================
// ==========================================================================
// SISTEMA DE NAVEGAÇÃO POR ABAS (DESKTOP & MOBILE)
// ==========================================================================
const RECENT_CHAPTERS_KEY = 'acf_recent_chapters';

function addRecentChapter(bookAbbrev, bookName, chapter) {
  try {
    let recents = JSON.parse(localStorage.getItem(RECENT_CHAPTERS_KEY) || '[]');
    recents = recents.filter(r => !(r.abbrev === bookAbbrev && r.chapter === chapter));
    recents.unshift({ abbrev: bookAbbrev, name: bookName, chapter, version: 'ACF' });
    recents = recents.slice(0, 5);
    localStorage.setItem(RECENT_CHAPTERS_KEY, JSON.stringify(recents));
    renderSidebarRecents();
  } catch (e) {
    console.error('Erro ao salvar recente:', e);
  }
}

function renderSidebarRecents() {
  const listEl = document.getElementById('sidebar-recents-list');
  if (!listEl) return;

  let recents = [];
  try {
    recents = JSON.parse(localStorage.getItem(RECENT_CHAPTERS_KEY) || '[]');
  } catch (e) {
    recents = [];
  }

  // Se não houver histórico inicial, preenche com sugestões bíblicas nobres
  if (recents.length === 0) {
    recents = [
      { abbrev: 'rm', name: 'Romanos', chapter: 11, version: 'ACF' },
      { abbrev: 'sl', name: 'Salmos', chapter: 23, version: 'ACF' },
      { abbrev: '1jo', name: '1João', chapter: 5, version: 'ACF' },
      { abbrev: 'jo', name: 'João', chapter: 3, version: 'ACF' }
    ];
  }

  listEl.innerHTML = recents.map(r => `
    <button class="sidebar-recent-item ${currentBookObj && currentBookObj.abbrev.pt === r.abbrev && currentChapterNum === r.chapter ? 'active' : ''}" data-abbrev="${r.abbrev}" data-chapter="${r.chapter}">
      <div class="recent-left">
        <svg class="recent-bookmark-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="recent-ref">${r.name} ${r.chapter}</span>
      </div>
      <span class="recent-version-tag">${r.version || 'ACF'}</span>
    </button>
  `).join('');

  listEl.querySelectorAll('.sidebar-recent-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const abbrev = btn.getAttribute('data-abbrev');
      const chap = parseInt(btn.getAttribute('data-chapter'), 10);
      openReader(abbrev, chap);
    });
  });
}

function initNavigation() {
  const allTabs = document.querySelectorAll('.tab-item, .nav-tab-btn');
  allTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = tab.getAttribute('data-tab');
      if (targetTab === 'bible' || targetTab === 'reader') {
        const bookmark = window.appState.getBookmark();
        if (currentBookObj) {
          openReader(currentBookObj.abbrev.pt, currentChapterNum);
        } else if (bookmark) {
          openReader(bookmark.bookAbbrev, bookmark.chapter, bookmark.verseNumber);
        } else {
          openReader('rm', 11);
        }
      } else if (targetTab === 'verse-day') {
        switchScreen('home');
        setTimeout(() => {
          const card = document.getElementById('card-verse-day');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else if (targetTab === 'plans') {
        switchScreen('home');
        setTimeout(() => {
          const carousel = document.getElementById('plans-carousel');
          if (carousel) carousel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else if (targetTab === 'account') {
        const modalAuth = document.getElementById('auth-modal');
        if (modalAuth) modalAuth.classList.remove('hidden');
      } else if (targetTab) {
        switchScreen(targetTab);
      }
    });
  });
}

// ==========================================================================
// BARRA SUPERIOR UNIFICADA (TOPBAR): BUSCA INTEGRADA, POP-OVER AA & CONTROLES
// ==========================================================================
function initTopbarControls() {
  const appEl = document.getElementById('app');
  const btnCollapse = document.getElementById('btn-collapse-sidebar');
  const btnExpand = document.getElementById('btn-expand-sidebar');
  const badgeVersion = document.getElementById('badge-topbar-version');
  const btnTopBook = document.getElementById('btn-topbar-book');
  const searchInput = document.getElementById('topbar-search-input');
  const btnClearSearch = document.getElementById('btn-topbar-search-clear');
  const btnFont = document.getElementById('btn-topbar-font');
  const fontPopover = document.getElementById('font-popover');
  const fontValueEl = document.getElementById('popover-font-value');
  const popoverDec = document.getElementById('popover-font-dec');
  const popoverInc = document.getElementById('popover-font-inc');

  // 1. Recolher / Expandir Menu Lateral
  if (btnCollapse) {
    btnCollapse.addEventListener('click', () => {
      if (appEl) appEl.classList.add('sidebar-collapsed');
    });
  }
  if (btnExpand) {
    btnExpand.addEventListener('click', () => {
      if (appEl) appEl.classList.remove('sidebar-collapsed');
    });
  }

  // 2. Badge Pílula ACF
  if (badgeVersion) {
    badgeVersion.addEventListener('click', () => {
      showToast('Almeida Corrigida Fiel (ACF) · Fiel aos Textos Originais');
    });
  }

  // 3. Botão Circular de Livro (abre o seletor rápido)
  if (btnTopBook) {
    btnTopBook.addEventListener('click', () => {
      if (currentBookObj) {
        const meta = booksList.find(b => b.abbrev.pt === currentBookObj.abbrev.pt);
        const count = meta ? meta.chapters : (currentBookObj.chapters || 50);
        openChapterPicker(currentBookObj.abbrev.pt, currentBookObj.name, count);
      } else {
        openChapterPicker('gn', 'Gênesis', 50);
      }
    });
  }

  // 4. Campo de Busca Integrada (Pílula)
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTopbarSearch(searchInput.value);
      }
    });

    searchInput.addEventListener('input', () => {
      if (btnClearSearch) {
        if (searchInput.value.trim().length > 0) {
          btnClearSearch.classList.remove('hidden');
        } else {
          btnClearSearch.classList.add('hidden');
        }
      }
    });
  }

  if (btnClearSearch && searchInput) {
    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.classList.add('hidden');
      searchInput.focus();
    });
  }

  // 5. Botão Circular "AA" e Popover de Fonte
  function updatePopoverFontDisplay(size) {
    if (fontValueEl) fontValueEl.textContent = `${size}px`;
  }
  updatePopoverFontDisplay(window.appState.fontSize);

  if (btnFont && fontPopover) {
    btnFont.addEventListener('click', (e) => {
      e.stopPropagation();
      fontPopover.classList.toggle('hidden');
      updatePopoverFontDisplay(window.appState.fontSize);
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
      if (!fontPopover.classList.contains('hidden')) {
        if (!fontPopover.contains(e.target) && e.target !== btnFont && !btnFont.contains(e.target)) {
          fontPopover.classList.add('hidden');
        }
      }
    });
  }

  if (popoverDec) {
    popoverDec.addEventListener('click', (e) => {
      e.stopPropagation();
      const newSize = window.appState.adjustFontSize(-1);
      document.documentElement.style.setProperty('--reader-font-size', `${newSize}px`);
      updatePopoverFontDisplay(newSize);
      showToast(`Fonte: ${newSize}px`);
    });
  }

  if (popoverInc) {
    popoverInc.addEventListener('click', (e) => {
      e.stopPropagation();
      const newSize = window.appState.adjustFontSize(1);
      document.documentElement.style.setProperty('--reader-font-size', `${newSize}px`);
      updatePopoverFontDisplay(newSize);
      showToast(`Fonte: ${newSize}px`);
    });
  }
}

function parseBibleReference(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();
  const match = clean.match(/^([1-3]?\s*[a-zA-ZÀ-ÿ]+)\s+([0-9]+)(?:[:,\.]([0-9]+))?$/i);
  if (!match) return null;

  const rawBook = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : null;

  const norm = rawBook.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');

  const aliases = {
    'gn': 'gn', 'genesis': 'gn',
    'ex': 'ex', 'exodo': 'ex',
    'lv': 'lv', 'levitico': 'lv',
    'nm': 'nm', 'numeros': 'nm',
    'dt': 'dt', 'deuteronomio': 'dt',
    'js': 'js', 'josue': 'js',
    'jz': 'jz', 'juizes': 'jz',
    'rt': 'rt', 'rute': 'rt',
    '1sm': '1sm', '1samuel': '1sm',
    '2sm': '2sm', '2samuel': '2sm',
    '1rs': '1rs', '1reis': '1rs',
    '2rs': '2rs', '2reis': '2rs',
    '1cr': '1cr', '1cronicas': '1cr',
    '2cr': '2cr', '2cronicas': '2cr',
    'ed': 'ed', 'esdras': 'ed',
    'ne': 'ne', 'neemias': 'ne',
    'et': 'et', 'ester': 'et',
    'jo': 'job', 'job': 'job',
    'sl': 'sl', 'salmo': 'sl', 'salmos': 'sl', 'ps': 'sl',
    'pv': 'pv', 'proverbios': 'pv',
    'ec': 'ec', 'eclesiastes': 'ec',
    'ct': 'ct', 'cantares': 'ct',
    'is': 'is', 'isaias': 'is',
    'jr': 'jr', 'jeremias': 'jr',
    'lm': 'lm', 'lamentacoes': 'lm',
    'ez': 'ez', 'ezequiel': 'ez',
    'dn': 'dn', 'daniel': 'dn',
    'os': 'os', 'oseias': 'os',
    'jl': 'jl', 'joel': 'jl',
    'am': 'am', 'amos': 'am',
    'ob': 'ob', 'obadias': 'ob',
    'jn': 'jn', 'jonas': 'jn',
    'mq': 'mq', 'miqueias': 'mq',
    'na': 'na', 'naum': 'na',
    'hc': 'hc', 'habacuque': 'hc',
    'sf': 'sf', 'sofonias': 'sf',
    'ag': 'ag', 'ageu': 'ag',
    'zc': 'zc', 'zacarias': 'zc',
    'ml': 'ml', 'malaquias': 'ml',
    'mt': 'mt', 'mateus': 'mt',
    'mc': 'mc', 'marcos': 'mc',
    'lc': 'lc', 'lucas': 'lc',
    'joao': 'jo', 'jo': 'jo',
    'at': 'at', 'atos': 'at',
    'rm': 'rm', 'romanos': 'rm',
    '1co': '1co', '1corintios': '1co',
    '2co': '2co', '2corintios': '2co',
    'gl': 'gl', 'galatas': 'gl',
    'ef': 'ef', 'efesios': 'ef',
    'fp': 'fp', 'filipenses': 'fp',
    'cl': 'cl', 'colossenses': 'cl',
    '1ts': '1ts', '1tessalonicenses': '1ts',
    '2ts': '2ts', '2tessalonicenses': '2ts',
    '1tm': '1tm', '1timoteo': '1tm',
    '2tm': '2tm', '2timoteo': '2tm',
    'tt': 'tt', 'tito': 'tt',
    'fm': 'fm', 'filemom': 'fm',
    'hb': 'hb', 'hebreus': 'hb',
    'tg': 'tg', 'tiago': 'tg',
    '1pe': '1pe', '1pedro': '1pe',
    '2pe': '2pe', '2pedro': '2pe',
    '1jo': '1jo', '1joao': '1jo',
    '2jo': '2jo', '2joao': '2jo',
    '3jo': '3jo', '3joao': '3jo',
    'jd': 'jd', 'judas': 'jd',
    'ap': 'ap', 'apocalipse': 'ap'
  };

  let abbrev = aliases[norm];
  if (!abbrev && booksList.length > 0) {
    const found = booksList.find(b => {
      const bNorm = b.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
      const bAbbrev = b.abbrev.pt.toLowerCase();
      return bNorm === norm || bAbbrev === norm || bNorm.startsWith(norm);
    });
    if (found) abbrev = found.abbrev.pt;
  }

  if (abbrev) {
    return { abbrev, chapter, verse };
  }
  return null;
}

function handleTopbarSearch(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return;

  const parsedRef = parseBibleReference(trimmed);
  if (parsedRef) {
    openReader(parsedRef.abbrev, parsedRef.chapter, parsedRef.verse);
    return;
  }

  // Busca textual nas Escrituras: redireciona para a tela de busca
  switchScreen('search');
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = trimmed;
    const event = new Event('input', { bubbles: true });
    searchInput.dispatchEvent(event);
  }
}

function switchScreen(screenName) {
  window.appState.activeScreen = screenName;

  // Atualiza classes responsivas do container raiz (#app) para o layout mobile
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.classList.remove('mobile-tab-home', 'mobile-tab-bible', 'mobile-tab-reader', 'mobile-tab-search', 'mobile-tab-confessions');
    appEl.classList.add(`mobile-tab-${screenName}`);

    // Se estiver saindo da tela de leitura ou indo para o dashboard, remove o reading-mode
    if (screenName !== 'reader') {
      appEl.classList.remove('reading-mode');
      const topbarInput = document.getElementById('topbar-search-input');
      if (topbarInput) {
        topbarInput.placeholder = 'Buscar livro ou termo (ex: Romanos 11)...';
      }
    }
  }

  // Atualiza as telas ativas na Coluna Central
  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => s.classList.remove('active'));

  let activeTargetId = `screen-${screenName}`;
  const targetScreen = document.getElementById(activeTargetId);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }

  // Atualiza botões ativos (desktop sidebar e mobile bottom tabbar)
  const allTabs = document.querySelectorAll('.tab-item, .nav-tab-btn');
  allTabs.forEach(tab => {
    const tabName = tab.getAttribute('data-tab');
    if ((screenName === 'reader' && tabName === 'bible') || tabName === screenName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Rola o container da coluna central para o topo
  const mainCol = document.getElementById('col-main-content');
  if (mainCol) mainCol.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// CARD: VERSO DO DIA (VERSO DO MOMENTO)
// ==========================================================================
async function initVerseOfTheDay() {
  const textEl = document.getElementById('verse-day-text');
  const refEl = document.getElementById('verse-day-ref');
  const btnContext = document.getElementById('btn-read-context');
  const btnRefresh = document.getElementById('btn-verse-refresh');

  async function loadVerse(isRefresh = false) {
    if (textEl) {
      textEl.style.opacity = '0.5';
      textEl.textContent = 'Buscando nas Escrituras...';
    }

    try {
      const verse = isRefresh
        ? await window.bibleApi.getRandomVerse()
        : window.bibleApi.getVerseOfTheDay();

      currentVerseDayData = verse;

      if (textEl && refEl && verse) {
        textEl.style.opacity = '1';
        textEl.textContent = `“${verse.text}”`;
        refEl.textContent = `${verse.book.name} ${verse.chapter}:${verse.number} · ACF`;
      }
    } catch (e) {
      if (textEl) {
        textEl.style.opacity = '1';
        textEl.textContent = '“Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...”';
        if (refEl) refEl.textContent = 'João 3:16 · ACF';
      }
    }
  }

  await loadVerse(false);

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async (e) => {
      e.stopPropagation();
      btnRefresh.style.transform = 'rotate(180deg)';
      await loadVerse(true);
      setTimeout(() => { btnRefresh.style.transform = 'none'; }, 250);
      showToast('Novo versículo carregado!');
    });
  }

  if (btnContext) {
    btnContext.addEventListener('click', () => {
      if (currentVerseDayData) {
        openReader(
          currentVerseDayData.book.abbrev.pt,
          currentVerseDayData.chapter,
          currentVerseDayData.number
        );
      } else {
        openReader('jo', 3, 16);
      }
    });
  }
}

// ==========================================================================
// CARD: CONTINUAR LENDO
// ==========================================================================
function initContinueReadingCard() {
  const card = document.getElementById('card-continue-reading');
  const titleEl = document.getElementById('continue-title');
  const labelEl = document.getElementById('continue-label');

  function updateCard() {
    const bookmark = window.appState.getBookmark();
    if (bookmark && titleEl) {
      titleEl.textContent = `${bookmark.bookName} ${bookmark.chapter}:${bookmark.verseNumber}`;
      if (labelEl) labelEl.textContent = 'Último marcador salvo';
    } else if (titleEl) {
      titleEl.textContent = 'Comece em Gênesis 1';
      if (labelEl) labelEl.textContent = 'Iniciar leitura';
    }
  }

  updateCard();
  window.appState.subscribe((event) => {
    if (event === 'bookmarkChanged') updateCard();
  });

  if (card) {
    card.addEventListener('click', () => {
      const bookmark = window.appState.getBookmark();
      if (bookmark) {
        openReader(bookmark.bookAbbrev, bookmark.chapter, bookmark.verseNumber);
      } else {
        openReader('gn', 1);
      }
    });
  }
}

// ==========================================================================
// ATALHOS VT & NT
// ==========================================================================
function initShortcuts() {
  const scVt = document.getElementById('shortcut-vt');
  const scNt = document.getElementById('shortcut-nt');

  if (scVt) {
    scVt.addEventListener('click', () => {
      switchScreen('bible');
      setTestamentFilter('VT');
    });
  }
  if (scNt) {
    scNt.addEventListener('click', () => {
      switchScreen('bible');
      setTestamentFilter('NT');
    });
  }
}

// ==========================================================================
// CARROSSEL: PLANOS EM DESTAQUE
// ==========================================================================
function initFeaturedPlans() {
  const planCards = document.querySelectorAll('.plan-card');
  const planModal = document.getElementById('plan-modal');
  const modalTitle = document.getElementById('plan-modal-title');
  const modalDesc = document.getElementById('plan-modal-desc');
  const btnStart = document.getElementById('btn-plan-start');
  const btnClose = document.getElementById('btn-close-plan-modal');

  let activePlan = null;

  planCards.forEach(card => {
    card.addEventListener('click', () => {
      const planId = card.getAttribute('data-plan');
      const plan = FEATURED_PLANS[planId];
      if (plan && planModal) {
        activePlan = plan;
        modalTitle.textContent = `${plan.title} (${plan.duration})`;
        modalDesc.textContent = plan.desc;
        planModal.classList.remove('hidden');
      }
    });
  });

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      planModal.classList.add('hidden');
    });
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (activePlan) {
        planModal.classList.add('hidden');
        openReader(activePlan.startBook, activePlan.startChap);
        showToast(`Plano "${activePlan.title}" iniciado!`);
      }
    });
  }
}

// ==========================================================================
// TELA: BÍBLIA (LIVROS, TESTAMENTOS E CAPÍTULOS)
// ==========================================================================
function initBibleScreen() {
  const tabVt = document.getElementById('tab-vt');
  const tabNt = document.getElementById('tab-nt');
  const filterInput = document.getElementById('book-filter-input');

  if (tabVt) tabVt.addEventListener('click', () => setTestamentFilter('VT'));
  if (tabNt) tabNt.addEventListener('click', () => setTestamentFilter('NT'));

  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      renderBibleBooks(e.target.value.trim());
    });
  }

  const versionPill = document.getElementById('badge-version-pill');
  if (versionPill) {
    versionPill.addEventListener('click', () => {
      const modal = document.getElementById('settings-modal');
      if (modal) modal.classList.remove('hidden');
    });
  }
}

function setTestamentFilter(testament) {
  window.appState.activeFilterTestament = testament;
  const tabVt = document.getElementById('tab-vt');
  const tabNt = document.getElementById('tab-nt');

  if (testament === 'VT') {
    tabVt?.classList.add('active');
    tabNt?.classList.remove('active');
  } else {
    tabNt?.classList.add('active');
    tabVt?.classList.remove('active');
  }

  const filterInput = document.getElementById('book-filter-input');
  renderBibleBooks(filterInput ? filterInput.value.trim() : '');
}

function renderBibleBooks(query = '') {
  const container = document.getElementById('bible-groups-list');
  if (!container || booksList.length === 0) return;

  const currentTestament = window.appState.activeFilterTestament;
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Filtra por testamento e busca
  const filtered = booksList.filter(book => {
    const matchTestament = book.testament === currentTestament;
    if (!matchTestament) return false;

    if (!normalizedQuery) return true;

    const normName = book.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normAbbrev = book.abbrev.pt.toLowerCase();
    return normName.includes(normalizedQuery) || normAbbrev.includes(normalizedQuery);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--ink-soft);">
        <p style="font-weight: 600;">Nenhum livro encontrado.</p>
        <span style="font-size: 13px;">Tente outro termo ou limpe o filtro.</span>
      </div>
    `;
    return;
  }

  // Agrupa os livros por categoria (group)
  const groupsMap = new Map();
  filtered.forEach(b => {
    const g = b.group || 'Geral';
    if (!groupsMap.has(g)) groupsMap.set(g, []);
    groupsMap.get(g).push(b);
  });

  let html = '';
  for (const [groupName, books] of groupsMap.entries()) {
    html += `
      <div class="bible-group-block">
        <div class="group-header">
          <span>${groupName}</span>
          <span>${books.length} ${books.length === 1 ? 'livro' : 'livros'}</span>
        </div>
        <div class="books-grid">
          ${books.map(b => `
            <div class="book-row-item" data-abbrev="${b.abbrev.pt}" data-name="${b.name}" data-chapters="${b.chapters}">
              <div class="book-row-left">
                <span class="book-abbrev-tag">${b.abbrev.pt}</span>
                <span class="book-name-label">${b.name}</span>
              </div>
              <div class="book-row-right">
                <span class="book-chapters-badge">${b.chapters} cap</span>
                <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Adiciona evento de clique para cada livro
  container.querySelectorAll('.book-row-item').forEach(item => {
    item.addEventListener('click', () => {
      const abbrev = item.getAttribute('data-abbrev');
      const name = item.getAttribute('data-name');
      const chapters = parseInt(item.getAttribute('data-chapters'), 10);
      openChapterPicker(abbrev, name, chapters);
    });
  });
}

// ==========================================================================
// MODAL: SELETOR DE LIVROS E CAPÍTULOS
// ==========================================================================
let modalActiveBook = null;
let modalActiveTestament = 'VT';

function openChapterPicker(bookAbbrev, bookName, chaptersCount) {
  const modal = document.getElementById('chapter-picker-modal');
  if (!modal) return;

  modalActiveBook = { abbrev: bookAbbrev, name: bookName, chapters: chaptersCount };
  renderModalChapters(bookAbbrev, bookName, chaptersCount);

  // Garante que a visão de capítulos esteja aberta inicialmente
  const chapContainer = document.getElementById('chapter-grid-container');
  const bookSelector = document.getElementById('modal-books-selector');
  const toggleText = document.getElementById('btn-modal-toggle-text');

  if (chapContainer) chapContainer.classList.remove('hidden');
  if (bookSelector) bookSelector.classList.add('hidden');
  if (toggleText) toggleText.textContent = 'Outro Livro';

  modal.classList.remove('hidden');
}

function renderModalChapters(bookAbbrev, bookName, chaptersCount) {
  const titleEl = document.getElementById('chapter-picker-book');
  const subEl = document.getElementById('chapter-picker-sub');
  const grid = document.getElementById('chapter-grid');

  if (titleEl) titleEl.textContent = bookName;
  if (subEl) subEl.textContent = `Selecione o capítulo (1 a ${chaptersCount})`;

  if (!grid) return;

  let buttonsHtml = '';
  for (let c = 1; c <= chaptersCount; c++) {
    const isCurrent = currentBookObj && currentBookObj.abbrev.pt === bookAbbrev && currentChapterNum === c;
    buttonsHtml += `
      <button class="chapter-num-btn ${isCurrent ? 'active' : ''}" data-chapter="${c}">
        ${c}
      </button>
    `;
  }
  grid.innerHTML = buttonsHtml;

  grid.querySelectorAll('.chapter-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const chap = parseInt(btn.getAttribute('data-chapter'), 10);
      const modal = document.getElementById('chapter-picker-modal');
      if (modal) modal.classList.add('hidden');
      openReader(bookAbbrev, chap);
    });
  });
}

function renderModalBooks(testament = 'VT') {
  modalActiveTestament = testament;
  const listEl = document.getElementById('modal-books-list');
  const tabVT = document.getElementById('modal-tab-vt');
  const tabNT = document.getElementById('modal-tab-nt');

  if (tabVT && tabNT) {
    tabVT.classList.toggle('active', testament === 'VT');
    tabNT.classList.toggle('active', testament === 'NT');
  }

  if (!listEl || booksList.length === 0) return;

  const filtered = booksList.filter(b => b.testament === testament);
  listEl.innerHTML = filtered.map(b => {
    const isActive = modalActiveBook && modalActiveBook.abbrev === b.abbrev.pt;
    return `
      <button class="modal-book-chip ${isActive ? 'active' : ''}" data-abbrev="${b.abbrev.pt}" data-name="${b.name}" data-chapters="${b.chapters}">
        ${b.name}
      </button>
    `;
  }).join('');

  listEl.querySelectorAll('.modal-book-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const abbrev = chip.getAttribute('data-abbrev');
      const name = chip.getAttribute('data-name');
      const chapters = parseInt(chip.getAttribute('data-chapters'), 10);
      modalActiveBook = { abbrev, name, chapters };
      renderModalChapters(abbrev, name, chapters);

      // Alterna de volta para a visualização de capítulos do livro escolhido
      const chapContainer = document.getElementById('chapter-grid-container');
      const bookSelector = document.getElementById('modal-books-selector');
      const toggleText = document.getElementById('btn-modal-toggle-text');
      if (chapContainer) chapContainer.classList.remove('hidden');
      if (bookSelector) bookSelector.classList.add('hidden');
      if (toggleText) toggleText.textContent = 'Outro Livro';
    });
  });
}

// ==========================================================================
// TELA: LEITURA (READER)
// ==========================================================================
async function openReader(bookAbbrev, chapterNumber, targetVerseNumber = null) {
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.classList.add('reading-mode');
  }
  switchScreen('reader');

  const titleEl = document.getElementById('reader-title');
  const subEl = document.getElementById('reader-subtitle');
  const contentEl = document.getElementById('reader-content');
  const btnPrev = document.getElementById('btn-prev-chapter');
  const btnNext = document.getElementById('btn-next-chapter');

  if (btnPrev) btnPrev.style.display = '';
  if (btnNext) btnNext.style.display = '';

  currentChapterNum = parseInt(chapterNumber, 10);

  // Exibe skeleton loader durante a requisição da API
  if (contentEl) {
    contentEl.innerHTML = `
      <div class="skeleton-loading">
        <div class="skeleton-line" style="width: 80%;"></div>
        <div class="skeleton-line" style="width: 95%;"></div>
        <div class="skeleton-line" style="width: 90%;"></div>
        <div class="skeleton-line" style="width: 85%;"></div>
        <div class="skeleton-line" style="width: 92%;"></div>
      </div>
    `;
  }

  try {
    const chapterData = await window.bibleApi.getChapter(bookAbbrev, currentChapterNum);
    currentBookObj = chapterData.book;

    if (titleEl) titleEl.textContent = `${chapterData.book.name} ${chapterData.chapter.number}`;
    
    // Perícope ou subtítulo temático (ex: "O futuro de Israel" para Romanos 11)
    const pericopeMap = {
      'rm-11': 'O futuro de Israel',
      'rm-8': 'A vida no Espírito · Mais que vencedores',
      'sl-23': 'O Senhor é o meu Pastor',
      'jo-3': 'O novo nascimento · Deus amou o mundo',
      'gn-1': 'A criação dos céus e da terra',
      'mt-5': 'O Sermão da Montanha · As bem-aventuranças',
      '1co-13': 'O hino ao amor',
      'ef-2': 'Pela graça sois salvos por meio da fé',
      'fp-4': 'Alegrai-vos sempre no Senhor',
      'hb-11': 'Os heróis da fé',
      'ap-22': 'O rio da água da vida · A volta de Cristo'
    };
    const pericopeKey = `${bookAbbrev.toLowerCase()}-${currentChapterNum}`;
    const pericopeEl = document.getElementById('reader-pericope-title');
    if (pericopeEl) {
      pericopeEl.textContent = pericopeMap[pericopeKey] || `${chapterData.book.group} · ACF`;
    }

    if (subEl) subEl.textContent = `${chapterData.book.testament === 'VT' ? 'Antigo Testamento' : 'Novo Testamento'} · ${chapterData.book.group}`;

    // Atualiza histórico de recentes na barra lateral
    addRecentChapter(chapterData.book.abbrev.pt, chapterData.book.name, chapterData.chapter.number);

    // Atualiza o campo de busca na barra superior para indicar o capítulo ativo (estilo YouVersion)
    const topbarInput = document.getElementById('topbar-search-input');
    if (topbarInput) {
      topbarInput.placeholder = `${chapterData.book.name} ${chapterData.chapter.number}`;
    }

    // Renderiza versículos em fluxo contínuo com sobrescrito
    const bookmark = window.appState.getBookmark();
    const isThisBookmarkedChapter = bookmark && bookmark.bookAbbrev === bookAbbrev && bookmark.chapter === currentChapterNum;

    const versesHtml = chapterData.verses.map(v => {
      const hlColor = window.appState.getHighlight(bookAbbrev, currentChapterNum, v.number);
      const hlClass = hlColor ? `hl-${hlColor}` : '';
      const isBookmarkedVerse = isThisBookmarkedChapter && bookmark.verseNumber === v.number;
      const star = isBookmarkedVerse ? '<span class="verse-star">★</span>' : '';

      return `
        <span class="verse-span ${hlClass}" data-verse="${v.number}" data-text="${encodeURIComponent(v.text)}">
          <sup class="verse-num">${star}${v.number}</sup>${escapeHtml(v.text)}&nbsp;
        </span>
      `;
    }).join('');

    if (contentEl) {
      contentEl.innerHTML = versesHtml;

      // Evento de toque em cada versículo
      contentEl.querySelectorAll('.verse-span').forEach(span => {
        span.addEventListener('click', () => {
          const vNum = parseInt(span.getAttribute('data-verse'), 10);
          const vText = decodeURIComponent(span.getAttribute('data-text'));
          openVerseActionSheet(span, vNum, vText);
        });
      });
    }

    // Configura botões de Anterior / Próximo (Flutuantes laterais e padrão)
    const floatPrev = document.getElementById('btn-floating-prev');
    const floatNext = document.getElementById('btn-floating-next');
    const currentBookMeta = booksList.find(b => b.abbrev.pt === bookAbbrev);
    const maxChapters = currentBookMeta ? currentBookMeta.chapters : 50;

    if (btnPrev) btnPrev.disabled = currentChapterNum <= 1;
    if (floatPrev) floatPrev.disabled = currentChapterNum <= 1;

    if (btnNext) btnNext.disabled = currentChapterNum >= maxChapters;
    if (floatNext) floatNext.disabled = currentChapterNum >= maxChapters;

    // Rola até o versículo alvo ou topo da coluna de leitura
    const readerScroll = document.getElementById('reader-scroll-container');
    if (targetVerseNumber) {
      setTimeout(() => {
        const targetEl = contentEl.querySelector(`.verse-span[data-verse="${targetVerseNumber}"]`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.add('selected');
          setTimeout(() => targetEl.classList.remove('selected'), 1800);
        }
      }, 300);
    } else if (readerScroll) {
      readerScroll.scrollTo({ top: 0, behavior: 'smooth' });
    }

  } catch (err) {
    if (contentEl) {
      contentEl.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--ink-soft);">
          <p style="font-weight: 700; color: #DC2626; margin-bottom: 8px;">Erro ao carregar o texto da API</p>
          <p style="font-size: 13px; line-height: 1.5; margin-bottom: 16px;">
            A API da Bíblia Digital pode estar instável ou o limite por IP foi atingido.
          </p>
          <button class="btn-read-context" onclick="openReader('${bookAbbrev}', ${currentChapterNum})" style="margin: 0 auto;">
            Tentar Novamente
          </button>
        </div>
      `;
    }
  }
}

function initReaderControls() {
  const btnBack = document.getElementById('btn-reader-back');
  const btnCopyChap = document.getElementById('btn-copy-chapter');
  const btnPrev = document.getElementById('btn-prev-chapter');
  const btnNext = document.getElementById('btn-next-chapter');
  const readerTitleBtn = document.getElementById('reader-title-btn');
  const btnReaderDec = document.getElementById('btn-reader-font-dec');
  const btnReaderInc = document.getElementById('btn-reader-font-inc');

  // 1. Botão "‹ Voltar": Sai do modo leitura e retorna ao dashboard / Início
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.classList.remove('reading-mode');
      }
      switchScreen('home');
    });
  }

  // 2. Título Central Clicável: Abre Seletor de Capítulos para Troca Rápida
  if (readerTitleBtn) {
    readerTitleBtn.addEventListener('click', () => {
      if (currentBookObj) {
        const meta = booksList.find(b => b.abbrev.pt === currentBookObj.abbrev.pt);
        const count = meta ? meta.chapters : (currentBookObj.chapters || 50);
        openChapterPicker(currentBookObj.abbrev.pt, currentBookObj.name, count);
      }
    });
  }

  // 3. Controles de Tamanho de Fonte na Barra Superior Mínima (A- / A+)
  if (btnReaderDec) {
    btnReaderDec.addEventListener('click', (e) => {
      e.stopPropagation();
      const newSize = window.appState.adjustFontSize(-1);
      document.documentElement.style.setProperty('--reader-font-size', `${newSize}px`);
      showToast(`Fonte: ${newSize}px`);
    });
  }

  if (btnReaderInc) {
    btnReaderInc.addEventListener('click', (e) => {
      e.stopPropagation();
      const newSize = window.appState.adjustFontSize(1);
      document.documentElement.style.setProperty('--reader-font-size', `${newSize}px`);
      showToast(`Fonte: ${newSize}px`);
    });
  }

  // 4. Copiar Capítulo Completo
  if (btnCopyChap) {
    btnCopyChap.addEventListener('click', () => {
      const contentEl = document.getElementById('reader-content');
      if (!contentEl) return;

      const title = currentBookObj ? `${currentBookObj.name} ${currentChapterNum} (ACF)` : 'Scriptura (ACF)';
      const text = Array.from(contentEl.querySelectorAll('.verse-span'))
        .map(span => {
          const num = span.getAttribute('data-verse');
          const rawText = decodeURIComponent(span.getAttribute('data-text'));
          return `${num}. ${rawText}`;
        })
        .join('\n');

      const fullPayload = `${title}\n\n${text}\n\nFonte: Almeida Corrigida Fiel (ACF) · Sola Scriptura`;
      navigator.clipboard.writeText(fullPayload).then(() => {
        showToast('Capítulo completo copiado!');
      }).catch(() => {
        showToast('Erro ao copiar capítulo');
      });
    });
  }

  // 5. Navegação entre Capítulos (Botões Flutuantes Laterais e do Leitor)
  const floatPrev = document.getElementById('btn-floating-prev');
  const floatNext = document.getElementById('btn-floating-next');

  function navigatePrevChapter() {
    if (currentChapterNum > 1 && currentBookObj) {
      openReader(currentBookObj.abbrev.pt, currentChapterNum - 1);
    }
  }

  function navigateNextChapter() {
    if (currentBookObj) {
      openReader(currentBookObj.abbrev.pt, currentChapterNum + 1);
    }
  }

  if (btnPrev) btnPrev.addEventListener('click', navigatePrevChapter);
  if (floatPrev) floatPrev.addEventListener('click', navigatePrevChapter);

  if (btnNext) btnNext.addEventListener('click', navigateNextChapter);
  if (floatNext) floatNext.addEventListener('click', navigateNextChapter);
}

// ==========================================================================
// SEÇÃO: HERÓI DO DASHBOARD & CONFISSÕES REFORMADAS
// ==========================================================================
function initHeroActions() {
  const btnHero = document.getElementById('btn-open-reader-hero');
  const heroBtnText = document.getElementById('hero-reading-btn-text');

  function updateHeroText() {
    const bookmark = window.appState.getBookmark();
    if (heroBtnText) {
      if (bookmark) {
        heroBtnText.textContent = `Continuar em ${bookmark.bookName} ${bookmark.chapter}`;
      } else {
        heroBtnText.textContent = 'Abrir Leitura Bíblica (Gênesis 1)';
      }
    }
  }

  updateHeroText();
  window.appState.subscribe((event) => {
    if (event === 'bookmarkChanged') updateHeroText();
  });

  if (btnHero) {
    btnHero.addEventListener('click', () => {
      const bookmark = window.appState.getBookmark();
      if (bookmark) {
        openReader(bookmark.bookAbbrev, bookmark.chapter, bookmark.verseNumber);
      } else {
        openReader('gn', 1);
      }
    });
  }
}

function initConfessionsScreen() {
  const container = document.getElementById('confessions-cards-grid');
  if (!container || !window.REFORMED_CONFESSIONS) return;

  const html = window.REFORMED_CONFESSIONS.map(c => `
    <article class="confession-card" data-id="${c.id}">
      <div class="confession-card-header">
        <span class="confession-card-badge">${c.category} · ${c.year}</span>
        <span class="confession-card-year">${c.sub}</span>
      </div>
      <h3 class="confession-card-title">${c.title}</h3>
      <p class="confession-card-summary">${c.summary}</p>
      <button class="confession-read-btn" data-id="${c.id}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
        <span>Ler Documento</span>
      </button>
    </article>
  `).join('');

  container.innerHTML = html;

  container.querySelectorAll('.confession-read-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      openConfessionReader(id);
    });
  });

  container.querySelectorAll('.confession-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      openConfessionReader(id);
    });
  });
}

function openConfessionReader(id) {
  if (!window.REFORMED_CONFESSIONS) return;
  const doc = window.REFORMED_CONFESSIONS.find(c => c.id === id);
  if (!doc) return;

  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.classList.add('reading-mode');
  }
  switchScreen('reader');

  const titleEl = document.getElementById('reader-title');
  const subEl = document.getElementById('reader-subtitle');
  const contentEl = document.getElementById('reader-content');
  const btnPrev = document.getElementById('btn-prev-chapter');
  const btnNext = document.getElementById('btn-next-chapter');

  if (titleEl) titleEl.textContent = doc.shortTitle || doc.title;
  if (subEl) subEl.textContent = `${doc.sub} · Sola Scriptura`;

  if (btnPrev) btnPrev.style.display = 'none';
  if (btnNext) btnNext.style.display = 'none';

  if (contentEl) {
    const sectionsHtml = doc.sections.map(s => `
      <div style="margin-bottom: 28px; border-bottom: 1px solid var(--line); padding-bottom: 20px;">
        <h4 style="font-family: var(--font-title); font-size: 17px; font-weight: 700; color: var(--brand); margin-bottom: 10px;">
          ${escapeHtml(s.title)}
        </h4>
        <p style="font-family: var(--font-body); font-size: var(--reader-font-size); line-height: 1.85; color: var(--ink); text-align: justify; margin: 0;">
          ${escapeHtml(s.text)}
        </p>
      </div>
    `).join('');

    contentEl.innerHTML = sectionsHtml;
  }

  const readerScroll = document.getElementById('reader-scroll-container');
  if (readerScroll) readerScroll.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// FOLHA DE AÇÕES DO VERSÍCULO (BOTTOM SHEET)
// ==========================================================================
function initVerseActionSheet() {
  const sheet = document.getElementById('verse-action-sheet');
  const swatches = document.querySelectorAll('.color-swatch-btn');
  const btnBookmark = document.getElementById('btn-sheet-bookmark');
  const btnCopy = document.getElementById('btn-sheet-copy');

  // Seleção e remoção de destaques de cores
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const color = swatch.getAttribute('data-color');
      if (currentSelectedVerse && currentBookObj) {
        window.appState.setHighlight(
          currentBookObj.abbrev.pt,
          currentChapterNum,
          currentSelectedVerse,
          color
        );

        // Atualiza a classe no versículo renderizado
        const span = document.querySelector(`.verse-span[data-verse="${currentSelectedVerse}"]`);
        if (span) {
          span.classList.remove('hl-yellow', 'hl-green', 'hl-pink', 'hl-blue');
          if (color) span.classList.add(`hl-${color}`);
        }

        // Atualiza estado ativo nos swatches
        swatches.forEach(s => s.classList.remove('active'));
        if (color) swatch.classList.add('active');

        showToast(color ? 'Versículo destacado!' : 'Destaque removido');
        closeVerseActionSheet();
      }
    });
  });

  // Marcar página (Bookmark)
  if (btnBookmark) {
    btnBookmark.addEventListener('click', () => {
      if (currentSelectedVerse && currentBookObj) {
        window.appState.setBookmark(
          currentBookObj.abbrev.pt,
          currentBookObj.name,
          currentChapterNum,
          currentSelectedVerse,
          currentVerseText
        );

        // Atualiza estrela no versículo
        document.querySelectorAll('.verse-span .verse-star').forEach(s => s.remove());
        const span = document.querySelector(`.verse-span[data-verse="${currentSelectedVerse}"]`);
        if (span) {
          const numEl = span.querySelector('.verse-num');
          if (numEl) {
            numEl.insertAdjacentHTML('afterbegin', '<span class="verse-star">★</span>');
          }
        }

        showToast('Marcador salvo com sucesso!');
        closeVerseActionSheet();
      }
    });
  }

  // Copiar versículo formatado
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      if (currentVerseText && currentBookObj) {
        const payload = `“${currentVerseText}” — ${currentBookObj.name} ${currentChapterNum}:${currentSelectedVerse} (ACF)`;
        navigator.clipboard.writeText(payload).then(() => {
          showToast('Versículo copiado!');
        }).catch(() => {
          showToast('Erro ao copiar');
        });
        closeVerseActionSheet();
      }
    });
  }

  // Fechar ao clicar no fundo escurecido
  if (sheet) {
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) {
        closeVerseActionSheet();
      }
    });
  }
}

function openVerseActionSheet(verseSpanEl, verseNumber, verseText) {
  const sheet = document.getElementById('verse-action-sheet');
  const refEl = document.getElementById('sheet-verse-ref');
  const snippetEl = document.getElementById('sheet-verse-snippet');
  const btnBookmark = document.getElementById('btn-sheet-bookmark');
  const swatches = document.querySelectorAll('.color-swatch-btn');

  currentSelectedVerse = verseNumber;
  currentVerseText = verseText;

  // Destaca o versículo selecionado
  document.querySelectorAll('.verse-span').forEach(s => s.classList.remove('selected'));
  verseSpanEl.classList.add('selected');

  if (refEl && currentBookObj) {
    refEl.textContent = `${currentBookObj.name} ${currentChapterNum}:${verseNumber}`;
  }
  if (snippetEl) {
    snippetEl.textContent = `“${verseText}”`;
  }

  // Atualiza swatches ativos
  if (currentBookObj) {
    const currentHl = window.appState.getHighlight(currentBookObj.abbrev.pt, currentChapterNum, verseNumber);
    swatches.forEach(s => {
      const c = s.getAttribute('data-color');
      s.classList.toggle('active', c === currentHl);
    });
  }

  // Verifica se este versículo já é o marcador atual
  const bookmark = window.appState.getBookmark();
  const isBookmarked = bookmark &&
    bookmark.bookAbbrev === currentBookObj.abbrev.pt &&
    bookmark.chapter === currentChapterNum &&
    bookmark.verseNumber === verseNumber;

  if (btnBookmark) {
    btnBookmark.classList.toggle('active', isBookmarked);
    const textBookmark = document.getElementById('text-sheet-bookmark');
    if (textBookmark) {
      textBookmark.textContent = isBookmarked ? 'Página marcada ★' : 'Marcar esta página';
    }
  }

  sheet.classList.remove('hidden');
}

function closeVerseActionSheet() {
  const sheet = document.getElementById('verse-action-sheet');
  if (sheet) sheet.classList.add('hidden');
  document.querySelectorAll('.verse-span').forEach(s => s.classList.remove('selected'));
}

// ==========================================================================
// TELA: BUSCA NAS ESCRITURAS (POST /verses/search)
// ==========================================================================
function initSearchScreen() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('btn-search-clear');
  const chips = document.querySelectorAll('.search-suggestions .chip-btn');
  const statusBar = document.getElementById('search-status-bar');
  const listEl = document.getElementById('search-results-list');

  async function performSearch(term) {
    const trimmed = (term || '').trim();
    if (!trimmed || trimmed.length < 2) {
      if (statusBar) statusBar.style.display = 'none';
      if (listEl) listEl.innerHTML = '';
      return;
    }

    if (statusBar) {
      statusBar.style.display = 'block';
      statusBar.textContent = `Pesquisando por "${trimmed}"...`;
    }

    if (listEl) {
      listEl.innerHTML = `
        <div class="skeleton-loading">
          <div class="skeleton-line" style="width: 70%;"></div>
          <div class="skeleton-line" style="width: 85%;"></div>
          <div class="skeleton-line" style="width: 75%;"></div>
        </div>
      `;
    }

    try {
      const results = await window.bibleApi.searchVerses(trimmed);

      if (!results || !results.verses || results.verses.length === 0) {
        if (statusBar) statusBar.textContent = `Nenhum resultado para "${trimmed}".`;
        if (listEl) {
          listEl.innerHTML = `
            <div style="text-align: center; padding: 36px 16px; color: var(--ink-soft);">
              <p style="font-weight: 700; margin-bottom: 6px;">Nenhum versículo encontrado</p>
              <span style="font-size: 13px;">Tente pesquisar por palavras sinônimas ou mais curtas.</span>
            </div>
          `;
        }
        return;
      }

      if (statusBar) {
        statusBar.textContent = `${results.occurrence || results.verses.length} versículos encontrados para "${trimmed}":`;
      }

      // Renderiza cada resultado em card
      const regex = new RegExp(`(${escapeRegex(trimmed)})`, 'gi');
      const html = results.verses.map(v => {
        const highlightedText = escapeHtml(v.text).replace(regex, '<mark>$1</mark>');
        const abbrev = (v.book.abbrev && (v.book.abbrev.pt || v.book.abbrev)) || '';
        return `
          <div class="search-result-card" data-abbrev="${abbrev}" data-chap="${v.chapter}" data-verse="${v.number}">
            <div class="search-result-ref">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
              <span>${v.book.name} ${v.chapter}:${v.number}</span>
            </div>
            <p class="search-result-snippet">“${highlightedText}”</p>
          </div>
        `;
      }).join('');

      if (listEl) {
        listEl.innerHTML = html;
        listEl.querySelectorAll('.search-result-card').forEach(card => {
          card.addEventListener('click', () => {
            const abbrev = card.getAttribute('data-abbrev');
            const chap = parseInt(card.getAttribute('data-chap'), 10);
            const verse = parseInt(card.getAttribute('data-verse'), 10);
            openReader(abbrev, chap, verse);
          });
        });
      }

    } catch (err) {
      if (statusBar) statusBar.textContent = 'Erro ao realizar a busca.';
    }
  }

  if (input) {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (clearBtn) clearBtn.classList.toggle('visible', val.length > 0);

      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        performSearch(val);
      }, 400);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchDebounceTimeout);
        performSearch(input.value);
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (input) {
        input.value = '';
        input.focus();
      }
      clearBtn.classList.remove('visible');
      if (statusBar) statusBar.style.display = 'none';
      if (listEl) listEl.innerHTML = '';
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (input) {
        input.value = q;
        if (clearBtn) clearBtn.classList.add('visible');
      }
      performSearch(q);
    });
  });
}

// ==========================================================================
// MODAIS: CONFIGURAÇÕES E FECHAMENTO
// ==========================================================================
function initModals() {
  const btnClosePicker = document.getElementById('btn-close-chapter-picker');
  const modalPicker = document.getElementById('chapter-picker-modal');
  const btnToggleBooks = document.getElementById('btn-modal-toggle-books');
  const chapContainer = document.getElementById('chapter-grid-container');
  const bookSelector = document.getElementById('modal-books-selector');
  const toggleText = document.getElementById('btn-modal-toggle-text');
  const tabVT = document.getElementById('modal-tab-vt');
  const tabNT = document.getElementById('modal-tab-nt');

  if (btnClosePicker && modalPicker) {
    btnClosePicker.addEventListener('click', () => modalPicker.classList.add('hidden'));
  }

  // Alternar entre grade de capítulos e lista de livros
  if (btnToggleBooks) {
    btnToggleBooks.addEventListener('click', () => {
      const isShowingBooks = bookSelector && !bookSelector.classList.contains('hidden');
      if (isShowingBooks) {
        if (chapContainer) chapContainer.classList.remove('hidden');
        if (bookSelector) bookSelector.classList.add('hidden');
        if (toggleText) toggleText.textContent = 'Outro Livro';
      } else {
        if (chapContainer) chapContainer.classList.add('hidden');
        if (bookSelector) bookSelector.classList.remove('hidden');
        if (toggleText) toggleText.textContent = 'Ver Capítulos';
        const currentMeta = modalActiveBook && booksList.find(b => b.abbrev.pt === modalActiveBook.abbrev);
        renderModalBooks(currentMeta ? currentMeta.testament : 'VT');
      }
    });
  }

  if (tabVT) {
    tabVT.addEventListener('click', () => renderModalBooks('VT'));
  }
  if (tabNT) {
    tabNT.addEventListener('click', () => renderModalBooks('NT'));
  }

  const btnOpenSettings = document.getElementById('btn-open-settings');
  const modalSettings = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings-modal');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const tokenInput = document.getElementById('setting-api-token');
  const supabaseUrlInput = document.getElementById('setting-supabase-url');
  const supabaseAnonKeyInput = document.getElementById('setting-supabase-anon-key');
  const btnClearCache = document.getElementById('btn-clear-cache');
  const linkOpenSupabaseSettings = document.getElementById('link-open-supabase-settings');

  if (btnOpenSettings && modalSettings) {
    btnOpenSettings.addEventListener('click', () => {
      if (tokenInput) {
        tokenInput.value = window.appState.apiConfig.token || '';
      }
      if (supabaseUrlInput && window.SCRIPTURA_CONFIG) {
        supabaseUrlInput.value = window.SCRIPTURA_CONFIG.supabaseUrl || '';
      }
      if (supabaseAnonKeyInput && window.SCRIPTURA_CONFIG) {
        supabaseAnonKeyInput.value = window.SCRIPTURA_CONFIG.supabaseAnonKey || '';
      }
      modalSettings.classList.remove('hidden');
    });
  }

  if (linkOpenSupabaseSettings && modalSettings) {
    linkOpenSupabaseSettings.addEventListener('click', (e) => {
      e.preventDefault();
      const authModal = document.getElementById('auth-modal');
      if (authModal) authModal.classList.add('hidden');
      if (supabaseUrlInput && window.SCRIPTURA_CONFIG) {
        supabaseUrlInput.value = window.SCRIPTURA_CONFIG.supabaseUrl || '';
      }
      if (supabaseAnonKeyInput && window.SCRIPTURA_CONFIG) {
        supabaseAnonKeyInput.value = window.SCRIPTURA_CONFIG.supabaseAnonKey || '';
      }
      modalSettings.classList.remove('hidden');
    });
  }

  if (btnCloseSettings && modalSettings) {
    btnCloseSettings.addEventListener('click', () => modalSettings.classList.add('hidden'));
  }

  if (btnSaveSettings && modalSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      const token = tokenInput ? tokenInput.value.trim() : '';
      window.appState.saveApiConfig({ token });

      const sbUrl = supabaseUrlInput ? supabaseUrlInput.value.trim() : '';
      const sbKey = supabaseAnonKeyInput ? supabaseAnonKeyInput.value.trim() : '';
      if (window.authManager && typeof window.authManager.connectWithCredentials === 'function') {
        await window.authManager.connectWithCredentials(sbUrl, sbKey);
      }

      showToast('Configurações e credenciais salvas com sucesso!');
      modalSettings.classList.add('hidden');
    });
  }

  if (btnClearCache) {
    btnClearCache.addEventListener('click', () => {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('acf_chap_') || k === STORAGE_KEYS.CACHE_BOOKS) {
          localStorage.removeItem(k);
        }
      }
      window.bibleApi.chaptersCache.clear();
      showToast('Cache de capítulos esvaziado!');
      if (modalSettings) modalSettings.classList.add('hidden');
    });
  }
}

// ==========================================================================
// STATUS DA API & RATE LIMIT DISCRETO
// ==========================================================================
function initApiStatusListener() {
  const statusDot = document.getElementById('status-dot');

  window.appState.subscribe((event, data) => {
    if (event === 'apiStatusChanged' && data) {
      if (data.rateLimitExceeded) {
        if (statusDot) statusDot.style.background = '#F59E0B';
        showToast('Limite oficial atingido. Usando espelho de leitura ininterrupta.');
      } else if (data.provider === 'mirror') {
        if (statusDot) statusDot.style.background = '#10B981';
      } else {
        if (statusDot) statusDot.style.background = '#10B981';
      }
    }
  });
}

// ==========================================================================
// UTILITÁRIOS: TOAST & SANITIZAÇÃO
// ==========================================================================
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2900);
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==========================================================================
// SISTEMA DE AUTENTICAÇÃO SEGURA, SINCRONIZAÇÃO EM NUVEM & LGPD
// ==========================================================================
function initAuthUI() {
  const btnOpenAuth = document.getElementById('btn-open-auth');
  const deskBtnAccount = document.getElementById('desk-btn-account');
  const modalAuth = document.getElementById('auth-modal');
  const btnCloseAuth = document.getElementById('btn-close-auth-modal');

  const authViewGuest = document.getElementById('auth-view-guest');
  const authViewLogged = document.getElementById('auth-view-logged');

  // Abas
  const tabBtnLogin = document.getElementById('tab-btn-login');
  const tabBtnRegister = document.getElementById('tab-btn-register');
  const tabBtnForgot = document.getElementById('tab-btn-forgot');
  const formLogin = document.getElementById('form-auth-login');
  const formRegister = document.getElementById('form-auth-register');
  const formForgot = document.getElementById('form-auth-forgot');

  // Campos e botões de formulário
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginTotpGroup = document.getElementById('login-2fa-group');
  const loginTotp = document.getElementById('login-totp');
  const loginError = document.getElementById('login-error-msg');
  const btnSubmitLogin = document.getElementById('btn-submit-login');

  const regName = document.getElementById('reg-name');
  const regEmail = document.getElementById('reg-email');
  const regPassword = document.getElementById('reg-password');
  const regPasswordConfirm = document.getElementById('reg-password-confirm');
  const pwStrengthFill = document.getElementById('pw-strength-fill');
  const pwStrengthText = document.getElementById('pw-strength-text');
  const regError = document.getElementById('reg-error-msg');
  const btnSubmitRegister = document.getElementById('btn-submit-register');

  const forgotEmail = document.getElementById('forgot-email');
  const forgotError = document.getElementById('forgot-error-msg');
  const forgotSuccess = document.getElementById('forgot-success-msg');
  const resetToken = document.getElementById('reset-token');
  const resetNewPassword = document.getElementById('reset-new-password');
  const btnSubmitReset = document.getElementById('btn-submit-reset');

  // Painel de Usuário Autenticado
  const loggedAvatar = document.getElementById('logged-user-avatar');
  const loggedName = document.getElementById('logged-user-name');
  const loggedEmail = document.getElementById('logged-user-email');
  const syncStatusDisplay = document.getElementById('sync-status-display');
  const btnSyncNow = document.getElementById('btn-sync-now');
  const syncLastTime = document.getElementById('sync-last-time');

  // 2FA
  const badge2fa = document.getElementById('badge-2fa-status');
  const btnToggle2fa = document.getElementById('btn-toggle-2fa');
  const totpPanel = document.getElementById('totp-setup-panel');
  const totpSecretText = document.getElementById('totp-secret-text');
  const btnCopyTotpSecret = document.getElementById('btn-copy-totp-secret');
  const totpConfirmCode = document.getElementById('totp-confirm-code');
  const btnVerify2fa = document.getElementById('btn-verify-2fa');

  // LGPD & Exclusão
  const btnExportLgpd = document.getElementById('btn-export-lgpd');
  const btnDeleteStart = document.getElementById('btn-delete-account-start');
  const deleteBox = document.getElementById('delete-account-box');
  const deletePassword = document.getElementById('delete-account-password');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');

  // Logout
  const btnLogout = document.getElementById('btn-auth-logout');
  const btnLogoutAll = document.getElementById('btn-auth-logout-all');

  // Topbar
  const topbarAvatar = document.getElementById('topbar-account-avatar');
  const topbarLabel = document.getElementById('topbar-account-label');
  const topbarSyncDot = document.getElementById('topbar-sync-indicator');

  // --- Funções de Abertura e Fechamento do Modal ---
  function openAuthModal() {
    if (modalAuth) {
      modalAuth.classList.remove('hidden');
    }
  }

  function closeAuthModal() {
    if (modalAuth) {
      modalAuth.classList.add('hidden');
    }
    // Limpa alertas temporários
    if (loginError) loginError.classList.add('hidden');
    if (regError) regError.classList.add('hidden');
    if (forgotError) forgotError.classList.add('hidden');
    if (forgotSuccess) forgotSuccess.classList.add('hidden');
    if (deleteBox) deleteBox.classList.add('hidden');
  }

  if (btnOpenAuth) btnOpenAuth.addEventListener('click', openAuthModal);
  if (deskBtnAccount) deskBtnAccount.addEventListener('click', openAuthModal);
  if (btnCloseAuth) btnCloseAuth.addEventListener('click', closeAuthModal);

  if (modalAuth) {
    modalAuth.addEventListener('click', (e) => {
      if (e.target === modalAuth) closeAuthModal();
    });
  }

  // --- Alternância de Abas (Entrar, Criar Conta, Recuperar) ---
  function switchAuthTab(tab) {
    const tabs = [tabBtnLogin, tabBtnRegister, tabBtnForgot];
    const forms = [formLogin, formRegister, formForgot];

    tabs.forEach(t => t && t.classList.remove('active'));
    forms.forEach(f => f && f.classList.add('hidden'));

    if (tab === 'login') {
      if (tabBtnLogin) tabBtnLogin.classList.add('active');
      if (formLogin) formLogin.classList.remove('hidden');
    } else if (tab === 'register') {
      if (tabBtnRegister) tabBtnRegister.classList.add('active');
      if (formRegister) formRegister.classList.remove('hidden');
    } else if (tab === 'forgot') {
      if (tabBtnForgot) tabBtnForgot.classList.add('active');
      if (formForgot) formForgot.classList.remove('hidden');
    }
  }

  if (tabBtnLogin) tabBtnLogin.addEventListener('click', () => switchAuthTab('login'));
  if (tabBtnRegister) tabBtnRegister.addEventListener('click', () => switchAuthTab('register'));
  if (tabBtnForgot) tabBtnForgot.addEventListener('click', () => switchAuthTab('forgot'));

  // --- Alternar Visibilidade da Senha (Mostrar / Ocultar) ---
  document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Ocultar';
      } else {
        input.type = 'password';
        btn.textContent = 'Mostrar';
      }
    });
  });

  // --- Medidor de Força de Senha (Baseline de Segurança) ---
  if (regPassword && pwStrengthFill && pwStrengthText) {
    regPassword.addEventListener('input', () => {
      const pw = regPassword.value || '';
      let score = 0;
      const weakList = ['123456', 'password', 'qwerty', 'scriptura', 'deus1234', 'biblia123'];

      if (pw.length >= 10) score += 1;
      if (pw.length >= 14) score += 1;
      if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
      if (/[0-9]/.test(pw)) score += 1;
      if (/[^a-zA-Z0-9]/.test(pw)) score += 1;

      for (const weak of weakList) {
        if (pw.toLowerCase().includes(weak)) {
          score = 0;
          break;
        }
      }

      if (pw.length < 10) {
        pwStrengthFill.style.width = '20%';
        pwStrengthFill.style.backgroundColor = '#EF4444';
        pwStrengthText.textContent = `Mínimo 10 caracteres (${pw.length}/10)`;
      } else if (score <= 2) {
        pwStrengthFill.style.width = '45%';
        pwStrengthFill.style.backgroundColor = '#F59E0B';
        pwStrengthText.textContent = 'Força: Razoável';
      } else if (score <= 4) {
        pwStrengthFill.style.width = '75%';
        pwStrengthFill.style.backgroundColor = '#10B981';
        pwStrengthText.textContent = 'Força: Boa';
      } else {
        pwStrengthFill.style.width = '100%';
        pwStrengthFill.style.backgroundColor = '#059669';
        pwStrengthText.textContent = 'Força: Muito Forte (Excelente)';
      }
    });
  }

  // --- Submissão: Login ---
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loginError) loginError.classList.add('hidden');

      const email = loginEmail ? loginEmail.value.trim() : '';
      const password = loginPassword ? loginPassword.value : '';
      const totpCode = loginTotp ? loginTotp.value.trim() : '';

      if (!email || !password) return;

      if (btnSubmitLogin) {
        btnSubmitLogin.disabled = true;
        btnSubmitLogin.innerHTML = '<span>Verificando...</span>';
      }

      try {
        const result = await window.authManager.login(email, password, totpCode);
        if (result && result.twoFactorRequired) {
          if (loginTotpGroup) loginTotpGroup.classList.remove('hidden');
          if (loginTotp) loginTotp.focus();
          if (loginError) {
            loginError.textContent = 'Autenticação em 2 etapas exigida. Digite o código de 6 dígitos.';
            loginError.classList.remove('hidden');
          }
          return;
        }

        showToast('Login realizado com sucesso! Sincronização ativada.');
        closeAuthModal();
      } catch (err) {
        if (loginError) {
          loginError.textContent = err.message || 'Falha na autenticação.';
          loginError.classList.remove('hidden');
        }
      } finally {
        if (btnSubmitLogin) {
          btnSubmitLogin.disabled = false;
          btnSubmitLogin.innerHTML = '<span>Entrar com Segurança</span>';
        }
      }
    });
  }

  // --- Submissão: Cadastro ---
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (regError) regError.classList.add('hidden');

      const name = regName ? regName.value.trim() : '';
      const email = regEmail ? regEmail.value.trim() : '';
      const password = regPassword ? regPassword.value : '';
      const passwordConfirm = regPasswordConfirm ? regPasswordConfirm.value : '';

      if (password !== passwordConfirm) {
        if (regError) {
          regError.textContent = 'As senhas informadas não coincidem.';
          regError.classList.remove('hidden');
        }
        return;
      }

      if (password.length < 10) {
        if (regError) {
          regError.textContent = 'A senha deve possuir pelo menos 10 caracteres.';
          regError.classList.remove('hidden');
        }
        return;
      }

      if (btnSubmitRegister) {
        btnSubmitRegister.disabled = true;
        btnSubmitRegister.innerHTML = '<span>Criando Conta...</span>';
      }

      try {
        await window.authManager.register(email, password, name);
        showToast('Conta protegida criada com sucesso!');
        closeAuthModal();
      } catch (err) {
        console.error('Falha ao cadastrar conta:', err, 'Status:', err.status, 'Corpo:', err.rawBody);
        if (regError) {
          regError.textContent = err.message || 'Não foi possível criar a conta, tente novamente.';
          regError.classList.remove('hidden');
        }
      } finally {
        if (btnSubmitRegister) {
          btnSubmitRegister.disabled = false;
          btnSubmitRegister.innerHTML = '<span>Criar Conta Protegida</span>';
        }
      }
    });
  }

  // --- Submissão: Recuperação de Senha ---
  if (formForgot) {
    formForgot.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (forgotError) forgotError.classList.add('hidden');
      if (forgotSuccess) forgotSuccess.classList.add('hidden');

      const email = forgotEmail ? forgotEmail.value.trim() : '';
      if (!email) return;

      try {
        const res = await window.authManager.forgotPassword(email);
        if (forgotSuccess) {
          let msg = res.message || 'Se o e-mail estiver cadastrado, o token de recuperação foi enviado.';
          if (res.dev_token) {
            msg += ` [Token para testes: ${res.dev_token}]`;
            if (resetToken) resetToken.value = res.dev_token;
          }
          forgotSuccess.textContent = msg;
          forgotSuccess.classList.remove('hidden');
        }
      } catch (err) {
        if (forgotError) {
          forgotError.textContent = err.message || 'Falha ao solicitar recuperação.';
          forgotError.classList.remove('hidden');
        }
      }
    });
  }

  // --- Redefinição com Token Único ---
  if (btnSubmitReset) {
    btnSubmitReset.addEventListener('click', async () => {
      const token = resetToken ? resetToken.value.trim() : '';
      const newPw = resetNewPassword ? resetNewPassword.value : '';

      if (!token || !newPw) {
        showToast('Preencha o token e a nova senha.');
        return;
      }
      if (newPw.length < 10) {
        showToast('A nova senha deve ter no mínimo 10 caracteres.');
        return;
      }

      try {
        await window.authManager.resetPassword(token, newPw);
        showToast('Senha redefinida com sucesso! Você já pode entrar.');
        switchAuthTab('login');
      } catch (err) {
        showToast(err.message || 'Token inválido ou expirado.');
      }
    });
  }

  // --- Painel Autenticado: Sincronização em Nuvem ---
  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', async () => {
      btnSyncNow.disabled = true;
      btnSyncNow.innerHTML = '<span>Sincronizando...</span>';
      try {
        await window.authManager.syncPull();
        await window.authManager.syncPush();
        showToast('Sincronização concluída com sucesso!');
      } catch (e) {
        showToast('Falha na sincronização.');
      } finally {
        btnSyncNow.disabled = false;
        btnSyncNow.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>Sincronizar Agora</span>
        `;
      }
    });
  }

  // --- Painel Autenticado: Configurar 2FA (TOTP) ---
  if (btnToggle2fa) {
    btnToggle2fa.addEventListener('click', async () => {
      if (!totpPanel) return;
      const isHidden = totpPanel.classList.contains('hidden');
      if (isHidden) {
        try {
          const res = await window.authManager.setup2FA();
          if (totpSecretText) totpSecretText.textContent = res.secret || '';
          totpPanel.classList.remove('hidden');
        } catch (err) {
          showToast(err.message || 'Erro ao gerar chave 2FA.');
        }
      } else {
        totpPanel.classList.add('hidden');
      }
    });
  }

  if (btnCopyTotpSecret) {
    btnCopyTotpSecret.addEventListener('click', () => {
      if (totpSecretText && totpSecretText.textContent) {
        navigator.clipboard.writeText(totpSecretText.textContent);
        showToast('Chave secreta copiada para a área de transferência!');
      }
    });
  }

  if (btnVerify2fa) {
    btnVerify2fa.addEventListener('click', async () => {
      const code = totpConfirmCode ? totpConfirmCode.value.trim() : '';
      if (!code) return;

      try {
        await window.authManager.verify2FA(code);
        showToast('Autenticação em 2 etapas ativada com sucesso!');
        if (totpPanel) totpPanel.classList.add('hidden');
        if (badge2fa) {
          badge2fa.textContent = 'Ativado ✅';
          badge2fa.classList.add('active');
        }
      } catch (err) {
        showToast(err.message || 'Código incorreto.');
      }
    });
  }

  // --- Painel Autenticado: Exportação de Dados Pessoais (LGPD) ---
  if (btnExportLgpd) {
    btnExportLgpd.addEventListener('click', async () => {
      try {
        await window.authManager.exportData();
        showToast('Dados exportados com sucesso (Portabilidade LGPD)!');
      } catch (err) {
        showToast('Erro ao exportar dados.');
      }
    });
  }

  // --- Painel Autenticado: Exclusão Definitiva da Conta (LGPD) ---
  if (btnDeleteStart && deleteBox) {
    btnDeleteStart.addEventListener('click', () => {
      deleteBox.classList.toggle('hidden');
    });
  }

  if (btnCancelDelete && deleteBox) {
    btnCancelDelete.addEventListener('click', () => {
      deleteBox.classList.add('hidden');
      if (deletePassword) deletePassword.value = '';
    });
  }

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
      const pw = deletePassword ? deletePassword.value : '';
      if (!pw) {
        showToast('Digite sua senha para confirmar a exclusão.');
        return;
      }

      if (!confirm('Esta ação apagará permanentemente sua conta e todos os dados na nuvem. Deseja prosseguir?')) {
        return;
      }

      try {
        await window.authManager.deleteAccount(pw);
        showToast('Sua conta e dados foram excluídos definitivamente.');
        closeAuthModal();
      } catch (err) {
        showToast(err.message || 'Senha incorreta para exclusão.');
      }
    });
  }

  // --- Encerramento de Sessão (Logout) ---
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await window.authManager.logout();
      showToast('Sessão encerrada com sucesso.');
      closeAuthModal();
    });
  }

  if (btnLogoutAll) {
    btnLogoutAll.addEventListener('click', async () => {
      await window.authManager.logoutAll();
      showToast('Todas as sessões em todos os dispositivos foram encerradas.');
      closeAuthModal();
    });
  }

  // --- Atualização de Estado da UI (Reatividade) ---
  function updateAuthUIState(user) {
    if (user) {
      if (authViewGuest) authViewGuest.classList.add('hidden');
      if (authViewLogged) authViewLogged.classList.remove('hidden');

      const displayName = user.name || user.email.split('@')[0];
      const initials = (user.name ? user.name.slice(0, 2) : user.email.slice(0, 2)).toUpperCase();

      if (topbarLabel) topbarLabel.textContent = displayName;
      if (topbarAvatar) topbarAvatar.textContent = initials;

      if (loggedAvatar) loggedAvatar.textContent = initials;
      if (loggedName) loggedName.textContent = user.name || 'Leitor Scriptura';
      if (loggedEmail) loggedEmail.textContent = user.email;

      if (badge2fa) {
        if (user.two_factor_enabled) {
          badge2fa.textContent = 'Ativado ✅';
          badge2fa.classList.add('active');
        } else {
          badge2fa.textContent = 'Desativado';
          badge2fa.classList.remove('active');
        }
      }
    } else {
      if (authViewGuest) authViewGuest.classList.remove('hidden');
      if (authViewLogged) authViewLogged.classList.add('hidden');

      if (topbarLabel) topbarLabel.textContent = 'Entrar';
      if (topbarAvatar) {
        topbarAvatar.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        `;
      }
    }

    const authUnconfiguredBanner = document.getElementById('auth-unconfigured-banner');
    if (authUnconfiguredBanner) {
      if (window.authManager && !window.authManager.isConfigured()) {
        authUnconfiguredBanner.classList.remove('hidden');
      } else {
        authUnconfiguredBanner.classList.add('hidden');
      }
    }
  }

  function updateSyncUIState(status, lastSynced) {
    if (!topbarSyncDot) return;
    topbarSyncDot.className = 'sync-indicator-dot';

    if (status === 'synced') {
      topbarSyncDot.classList.add('synced');
      if (syncStatusDisplay) syncStatusDisplay.textContent = 'Sincronizado ✅';
      if (syncLastTime && lastSynced) {
        const timeStr = new Date(lastSynced).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        syncLastTime.textContent = `Hoje às ${timeStr}`;
      }
    } else if (status === 'syncing') {
      topbarSyncDot.classList.add('syncing');
      if (syncStatusDisplay) syncStatusDisplay.textContent = 'Sincronizando...';
    } else if (status === 'error') {
      topbarSyncDot.classList.add('error');
      if (syncStatusDisplay) syncStatusDisplay.textContent = 'Falha na sincronização';
    } else {
      if (syncStatusDisplay) syncStatusDisplay.textContent = 'Modo Local';
    }
  }

  // Inscreve nos eventos do gerenciador de autenticação
  window.authManager.subscribe((event, data) => {
    if (event === 'authStateChanged') {
      updateAuthUIState(data.user);
    } else if (event === 'syncStateChanged') {
      updateSyncUIState(data.status, data.lastSynced);
    }
  });

  // Checa a sessão ativa ao iniciar
  window.authManager.checkSession().catch(() => {});
}

