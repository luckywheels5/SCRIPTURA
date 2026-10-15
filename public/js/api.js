/**
 * SCRIPTURA — Leitura Bíblica (Sola Scriptura · ACF)
 * Camada de Integração com API (A Bíblia Digital + Fallback Resiliente)
 */

// Fallback canônico dos 66 Livros da Bíblia (ACF) com grupos e testamentos oficiais
const CANONICAL_BOOKS = [
  // Antigo Testamento (39)
  { abbrev: { pt: 'gn' }, name: 'Gênesis', chapters: 50, group: 'Pentateuco', testament: 'VT' },
  { abbrev: { pt: 'ex' }, name: 'Êxodo', chapters: 40, group: 'Pentateuco', testament: 'VT' },
  { abbrev: { pt: 'lv' }, name: 'Levítico', chapters: 27, group: 'Pentateuco', testament: 'VT' },
  { abbrev: { pt: 'nm' }, name: 'Números', chapters: 36, group: 'Pentateuco', testament: 'VT' },
  { abbrev: { pt: 'dt' }, name: 'Deuteronômio', chapters: 34, group: 'Pentateuco', testament: 'VT' },
  { abbrev: { pt: 'js' }, name: 'Josué', chapters: 24, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: 'jz' }, name: 'Juízes', chapters: 21, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: 'rt' }, name: 'Rute', chapters: 4, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: '1sm' }, name: '1 Samuel', chapters: 31, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: '2sm' }, name: '2 Samuel', chapters: 24, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: '1rs' }, name: '1 Reis', chapters: 22, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: '2rs' }, name: '2 Reis', chapters: 25, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: '1cr' }, name: '1 Crônicas', chapters: 29, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: '2cr' }, name: '2 Crônicas', chapters: 36, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: 'ed' }, name: 'Esdras', chapters: 10, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: 'ne' }, name: 'Neemias', chapters: 13, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: 'et' }, name: 'Ester', chapters: 10, group: 'Históricos', testament: 'VT' },
  { abbrev: { pt: 'jó' }, name: 'Jó', chapters: 42, group: 'Poéticos', testament: 'VT' },
  { abbrev: { pt: 'sl' }, name: 'Salmos', chapters: 150, group: 'Poéticos', testament: 'VT' },
  { abbrev: { pt: 'pv' }, name: 'Provérbios', chapters: 31, group: 'Poéticos', testament: 'VT' },
  { abbrev: { pt: 'ec' }, name: 'Eclesiastes', chapters: 12, group: 'Poéticos', testament: 'VT' },
  { abbrev: { pt: 'ct' }, name: 'Cânticos', chapters: 8, group: 'Poéticos', testament: 'VT' },
  { abbrev: { pt: 'is' }, name: 'Isaías', chapters: 66, group: 'Profetas Maiores', testament: 'VT' },
  { abbrev: { pt: 'jr' }, name: 'Jeremias', chapters: 52, group: 'Profetas Maiores', testament: 'VT' },
  { abbrev: { pt: 'lm' }, name: 'Lamentações', chapters: 5, group: 'Profetas Maiores', testament: 'VT' },
  { abbrev: { pt: 'ez' }, name: 'Ezequiel', chapters: 48, group: 'Profetas Maiores', testament: 'VT' },
  { abbrev: { pt: 'dn' }, name: 'Daniel', chapters: 12, group: 'Profetas Maiores', testament: 'VT' },
  { abbrev: { pt: 'os' }, name: 'Oséias', chapters: 14, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'jl' }, name: 'Joel', chapters: 3, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'am' }, name: 'Amós', chapters: 9, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'ob' }, name: 'Obadias', chapters: 1, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'jn' }, name: 'Jonas', chapters: 4, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'mq' }, name: 'Miquéias', chapters: 7, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'na' }, name: 'Naum', chapters: 3, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'hc' }, name: 'Habacuque', chapters: 3, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'sf' }, name: 'Sofonias', chapters: 3, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'ag' }, name: 'Ageu', chapters: 2, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'zc' }, name: 'Zacarias', chapters: 14, group: 'Profetas Menores', testament: 'VT' },
  { abbrev: { pt: 'ml' }, name: 'Malaquias', chapters: 4, group: 'Profetas Menores', testament: 'VT' },
  // Novo Testamento (27)
  { abbrev: { pt: 'mt' }, name: 'Mateus', chapters: 28, group: 'Evangelhos', testament: 'NT' },
  { abbrev: { pt: 'mc' }, name: 'Marcos', chapters: 16, group: 'Evangelhos', testament: 'NT' },
  { abbrev: { pt: 'lc' }, name: 'Lucas', chapters: 24, group: 'Evangelhos', testament: 'NT' },
  { abbrev: { pt: 'jo' }, name: 'João', chapters: 21, group: 'Evangelhos', testament: 'NT' },
  { abbrev: { pt: 'at' }, name: 'Atos', chapters: 28, group: 'Histórico', testament: 'NT' },
  { abbrev: { pt: 'rm' }, name: 'Romanos', chapters: 16, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: '1co' }, name: '1 Coríntios', chapters: 16, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: '2co' }, name: '2 Coríntios', chapters: 13, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: 'gl' }, name: 'Gálatas', chapters: 6, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: 'ef' }, name: 'Efésios', chapters: 6, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: 'fp' }, name: 'Filipenses', chapters: 4, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: 'cl' }, name: 'Colossenses', chapters: 4, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: '1ts' }, name: '1 Tessalonicenses', chapters: 5, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: '2ts' }, name: '2 Tessalonicenses', chapters: 3, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: '1tm' }, name: '1 Timóteo', chapters: 6, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: '2tm' }, name: '2 Timóteo', chapters: 4, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: 'tt' }, name: 'Tito', chapters: 3, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: 'fm' }, name: 'Filemom', chapters: 1, group: 'Cartas Paulinas', testament: 'NT' },
  { abbrev: { pt: 'hb' }, name: 'Hebreus', chapters: 13, group: 'Cartas Gerais', testament: 'NT' },
  { abbrev: { pt: 'tg' }, name: 'Tiago', chapters: 5, group: 'Cartas Gerais', testament: 'NT' },
  { abbrev: { pt: '1pe' }, name: '1 Pedro', chapters: 5, group: 'Cartas Gerais', testament: 'NT' },
  { abbrev: { pt: '2pe' }, name: '2 Pedro', chapters: 3, group: 'Cartas Gerais', testament: 'NT' },
  { abbrev: { pt: '1jo' }, name: '1 João', chapters: 5, group: 'Cartas Gerais', testament: 'NT' },
  { abbrev: { pt: '2jo' }, name: '2 João', chapters: 1, group: 'Cartas Gerais', testament: 'NT' },
  { abbrev: { pt: '3jo' }, name: '3 João', chapters: 1, group: 'Cartas Gerais', testament: 'NT' },
  { abbrev: { pt: 'jd' }, name: 'Judas', chapters: 1, group: 'Cartas Gerais', testament: 'NT' },
  { abbrev: { pt: 'ap' }, name: 'Apocalipse', chapters: 22, group: 'Profético', testament: 'NT' }
];

// Conjunto das abreviações do Antigo Testamento para fallback conforme especificação
const VT_ABBREVS = new Set(CANONICAL_BOOKS.filter(b => b.testament === 'VT').map(b => b.abbrev.pt));

// Versículos emblemáticos para semente determinística / verso do dia offline
const INSPIRATIONAL_VERSES = [
  { book: { name: 'João', abbrev: { pt: 'jo' } }, chapter: 3, number: 16, text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' },
  { book: { name: 'Filipenses', abbrev: { pt: 'fp' } }, chapter: 4, number: 13, text: 'Posso todas as coisas naquele que me fortalece.' },
  { book: { name: 'Salmos', abbrev: { pt: 'sl' } }, chapter: 23, number: 1, text: 'O SENHOR é o meu pastor, nada me faltará.' },
  { book: { name: 'Isaías', abbrev: { pt: 'is' } }, chapter: 40, number: 31, text: 'Mas os que esperam no SENHOR renovarão as suas forças, subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão.' },
  { book: { name: 'Romanos', abbrev: { pt: 'rm' } }, chapter: 8, number: 28, text: 'E sabemos que todas as coisas conspiram para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.' },
  { book: { name: 'Jeremias', abbrev: { pt: 'jr' } }, chapter: 29, number: 11, text: 'Porque eu sei os pensamentos que penso a vosso respeito, diz o SENHOR; pensamentos de paz, e não de mal, para vos dar o fim que esperais.' },
  { book: { name: 'Provérbios', abbrev: { pt: 'pv' } }, chapter: 3, number: 5, text: 'Confia no SENHOR de todo o teu coração, e não te estribes no teu próprio entendimento.' },
  { book: { name: 'Josué', abbrev: { pt: 'js' } }, chapter: 1, number: 9, text: 'Não te mandei eu? Esforça-te, e tem bom ânimo; não temas, nem te espantes; porque o SENHOR teu Deus é contigo, por onde quer que andares.' },
  { book: { name: 'Salmos', abbrev: { pt: 'sl' } }, chapter: 91, number: 1, text: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.' },
  { book: { name: 'Mateus', abbrev: { pt: 'mt' } }, chapter: 6, number: 33, text: 'Mas, buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.' },
  { book: { name: '2 Timóteo', abbrev: { pt: '2tm' } }, chapter: 1, number: 7, text: 'Porque Deus não nos deu o espírito de temor, mas de fortaleza, e de amor, e de moderação.' },
  { book: { name: 'Salmos', abbrev: { pt: 'sl' } }, chapter: 119, number: 105, text: 'Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.' },
  { book: { name: 'Romanos', abbrev: { pt: 'rm' } }, chapter: 12, number: 2, text: 'E não vos conformeis com este século, mas transformai-vos pela renovação da vossa mente, para que experimenteis qual seja a boa, agradável e perfeita vontade de Deus.' },
  { book: { name: 'Gálatas', abbrev: { pt: 'gl' } }, chapter: 2, number: 20, text: 'Já estou crucificado com Cristo; e vivo, não mais eu, mas Cristo vive em mim; e a vida que agora vivo na carne, vivo-a na fé do Filho de Deus, que me amou e se entregou a si mesmo por mim.' },
  { book: { name: '1 Pedro', abbrev: { pt: '1pe' } }, chapter: 5, number: 7, text: 'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.' }
];

class BibleApiService {
  constructor() {
    this.booksCache = null;
    this.chaptersCache = new Map();
    this.status = {
      isOnline: true,
      provider: 'abibliadigital', // 'abibliadigital' | 'mirror'
      rateLimitExceeded: false,
      lastError: null
    };
  }

  // Cabeçalhos HTTP para requisições oficiais
  _getHeaders() {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const token = window.appState?.apiConfig?.token;
    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }
    return headers;
  }

  _notifyStatusChange() {
    if (window.appState) {
      window.appState.notify('apiStatusChanged', this.status);
    }
  }

  // --- 1. LISTAR LIVROS (GET /books) ---
  async getBooks() {
    // 1. Tenta recuperar do cache de memória ou localStorage
    if (this.booksCache && this.booksCache.length > 0) {
      return this.booksCache;
    }
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.CACHE_BOOKS);
      if (cached) {
        this.booksCache = JSON.parse(cached);
        return this.booksCache;
      }
    } catch (e) {}

    const baseUrl = window.appState?.apiConfig?.baseUrl || 'https://www.abibliadigital.com.br/api';
    let fetchedBooks = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const data = await window.fetchJson(`${baseUrl}/books`, {
        method: 'GET',
        headers: this._getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (Array.isArray(data) && data.length > 0) {
        fetchedBooks = data.map(b => {
          const abbrevPt = (b.abbrev && (b.abbrev.pt || b.abbrev)) || '';
          // Se o campo testament vier ausente, usar fallback estático com as abreviações do VT
          let testament = b.testament;
          if (!testament) {
            testament = VT_ABBREVS.has(abbrevPt.toLowerCase()) ? 'VT' : 'NT';
          }
          return {
            abbrev: { pt: abbrevPt.toLowerCase() },
            name: b.name,
            chapters: b.chapters,
            group: b.group || 'Geral',
            testament: testament
          };
        });
        this.status.provider = 'abibliadigital';
        this.status.rateLimitExceeded = false;
      }
    } catch (err) {
      if (err.status === 429) {
        this.status.rateLimitExceeded = true;
        this.status.lastError = 'Limite de 20 requisições/hora por IP excedido na API oficial.';
      } else {
        this.status.provider = 'mirror';
        this.status.lastError = err.message;
      }
      console.warn('API oficial A Bíblia Digital indisponível para /books. Ativando catálogo canônico:', err.message);
      this._notifyStatusChange();
    }

    // Se a API não respondeu ou deu erro/503/429, usa a lista canônica oficial
    const result = fetchedBooks || CANONICAL_BOOKS;
    this.booksCache = result;
    try {
      localStorage.setItem(STORAGE_KEYS.CACHE_BOOKS, JSON.stringify(result));
    } catch (e) {}
    return result;
  }

  // --- 2. CARREGAR UM CAPÍTULO (GET /verses/acf/{abbrev}/{chapter}) ---
  async getChapter(abbrev, chapter) {
    const bookAbbrev = (abbrev || '').toLowerCase().trim();
    const chapNum = parseInt(chapter, 10);

    // Validação estrita para evitar URLs quebradas (.../verses/acf/undefined/1)
    if (!bookAbbrev || isNaN(chapNum) || chapNum < 1) {
      throw new Error('Livro ou capítulo inválido para leitura.');
    }

    const cacheKey = `${bookAbbrev}_${chapNum}`;

    // 1. Verifica cache local
    if (this.chaptersCache.has(cacheKey)) {
      return this.chaptersCache.get(cacheKey);
    }
    try {
      const cachedData = localStorage.getItem(`acf_chap_${cacheKey}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.chaptersCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch (e) {}

    const books = await this.getBooks();
    const bookMeta = books.find(b => b.abbrev.pt === bookAbbrev) || {
      abbrev: { pt: bookAbbrev },
      name: bookAbbrev.toUpperCase(),
      chapters: 50,
      group: 'Geral',
      testament: VT_ABBREVS.has(bookAbbrev) ? 'VT' : 'NT'
    };

    let chapterResult = null;
    const baseUrl = window.appState?.apiConfig?.baseUrl || 'https://www.abibliadigital.com.br/api';

    // Tentativa 1: Endpoint oficial A Bíblia Digital
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const data = await window.fetchJson(`${baseUrl}/verses/acf/${bookAbbrev}/${chapNum}`, {
        method: 'GET',
        headers: this._getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (data && data.verses) {
        chapterResult = {
          book: {
            name: data.book?.name || bookMeta.name,
            abbrev: { pt: bookAbbrev },
            group: data.book?.group || bookMeta.group,
            testament: bookMeta.testament
          },
          chapter: {
            number: chapNum,
            verses: data.verses.length
          },
          verses: data.verses.map(v => ({
            number: v.number,
            text: v.text.trim()
          }))
        };
        this.status.provider = 'abibliadigital';
        this.status.rateLimitExceeded = false;
      }
    } catch (err) {
      if (err.status === 429) {
        this.status.rateLimitExceeded = true;
        this.status.lastError = 'Limite de 20 requisições/hora por IP atingido.';
      }
      console.warn(`Tentando obter capítulo ${bookAbbrev} ${chapNum} via espelho Almeida (online)...`, err.message);
      this.status.provider = 'mirror';
      this._notifyStatusChange();

      // Tentativa 2: Espelho online público bible-api.com (Tradução Almeida em tempo real)
      chapterResult = await this._fetchChapterFromMirror(bookMeta, chapNum);
    }

    if (!chapterResult) {
      throw new Error(`Não foi possível carregar o capítulo ${bookMeta.name} ${chapNum}.`);
    }

    // Salva no cache de memória e localStorage para economizar requisições
    this.chaptersCache.set(cacheKey, chapterResult);
    try {
      localStorage.setItem(`acf_chap_${cacheKey}`, JSON.stringify(chapterResult));
    } catch (e) {}

    return chapterResult;
  }

  // Provedor Espelho público em tempo real (Almeida)
  async _fetchChapterFromMirror(bookMeta, chapterNumber) {
    try {
      const encodedBook = encodeURIComponent(bookMeta.name);
      const url = `https://bible-api.com/${encodedBook}+${chapterNumber}?translation=almeida`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const data = await window.fetchJson(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (data && data.verses && data.verses.length > 0) {
        return {
          book: {
            name: bookMeta.name,
            abbrev: { pt: bookMeta.abbrev.pt },
            group: bookMeta.group,
            testament: bookMeta.testament
          },
          chapter: {
            number: chapterNumber,
            verses: data.verses.length
          },
          verses: data.verses.map(v => ({
            number: v.verse,
            text: (v.text || '').replace(/\s+/g, ' ').trim()
          }))
        };
      }
    } catch (mirrorErr) {
      console.error('Erro no espelho bible-api:', mirrorErr);
    }
    return null;
  }

  // --- 3. VERSO ALEATÓRIO (GET /verses/acf/random) ---
  async getRandomVerse() {
    const baseUrl = window.appState?.apiConfig?.baseUrl || 'https://www.abibliadigital.com.br/api';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const data = await window.fetchJson(`${baseUrl}/verses/acf/random`, {
        method: 'GET',
        headers: this._getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (data && data.text) {
        return {
          book: {
            name: data.book?.name || 'Salmos',
            abbrev: { pt: (data.book?.abbrev?.pt || 'sl').toLowerCase() }
          },
          chapter: data.chapter || 1,
          number: data.number || 1,
          text: data.text.trim()
        };
      }
    } catch (e) {
      console.warn('API oficial indisponível para verso aleatório, utilizando semente inspiracional:', e.message);
    }

    // Fallback: seleciona aleatoriamente da seleção de versículos
    const idx = Math.floor(Math.random() * INSPIRATIONAL_VERSES.length);
    return INSPIRATIONAL_VERSES[idx];
  }

  // Verso do Dia Determinístico (baseado no dia do ano para manter o mesmo durante todo o dia)
  getVerseOfTheDay() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const idx = dayOfYear % INSPIRATIONAL_VERSES.length;
    return INSPIRATIONAL_VERSES[idx];
  }

  // --- 4. BUSCAR PALAVRA / EXPRESSÃO (POST /verses/search) ---
  async searchVerses(query) {
    const term = (query || '').trim();
    if (!term || term.length < 2) {
      return { occurrence: 0, verses: [] };
    }

    const baseUrl = window.appState?.apiConfig?.baseUrl || 'https://www.abibliadigital.com.br/api';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const data = await window.fetchJson(`${baseUrl}/verses/search`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify({
          version: 'acf',
          search: term
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (data && data.verses) {
        return {
          occurrence: data.occurrence || data.verses.length,
          verses: data.verses.map(v => ({
            book: {
              name: v.book?.name || 'Bíblia',
              abbrev: { pt: (v.book?.abbrev?.pt || '').toLowerCase() }
            },
            chapter: v.chapter,
            number: v.number,
            text: v.text.trim()
          }))
        };
      }
    } catch (e) {
      if (e.status === 429) {
        this.status.rateLimitExceeded = true;
        this._notifyStatusChange();
      }
      console.warn('Busca na API oficial falhou ou offline:', e.message);
    }

    // Fallback de busca inteligente local nos versículos emblemáticos e capítulos em cache
    return this._localSearchFallback(term);
  }

  _localSearchFallback(term) {
    const lowerTerm = term.toLowerCase();
    const results = [];

    // Busca na lista inspiracional
    for (const v of INSPIRATIONAL_VERSES) {
      if (v.text.toLowerCase().includes(lowerTerm)) {
        results.push(v);
      }
    }

    // Busca nos capítulos que já estão em cache
    for (const [key, chap] of this.chaptersCache.entries()) {
      for (const v of chap.verses) {
        if (v.text.toLowerCase().includes(lowerTerm)) {
          results.push({
            book: { name: chap.book.name, abbrev: chap.book.abbrev },
            chapter: chap.chapter.number,
            number: v.number,
            text: v.text
          });
        }
      }
    }

    return {
      occurrence: results.length,
      verses: results
    };
  }
}

// Instância global do serviço de API
window.bibleApi = new BibleApiService();
