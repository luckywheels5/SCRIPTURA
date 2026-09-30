import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../domain/models/book.dart';
import '../../domain/models/verse.dart';
import '../../domain/models/user_highlight.dart';
import '../../domain/models/devotional.dart';
import '../../domain/models/user_prayer.dart';

class DatabaseHelper {
  DatabaseHelper._();
  static final DatabaseHelper instance = DatabaseHelper._();

  static const String _dbFileName = 'scriptura_acf.db';
  static const String _assetDbPath = 'assets/database/biblia_acf.db';

  Database? _db;

  Future<Database> get database async {
    if (_db != null && _db!.isOpen) return _db!;
    _db = await _initDatabase();
    return _db!;
  }

  Future<Database> _initDatabase() async {
    if (!kIsWeb &&
        (defaultTargetPlatform == TargetPlatform.linux ||
            defaultTargetPlatform == TargetPlatform.windows ||
            defaultTargetPlatform == TargetPlatform.macOS)) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    final supportDir = await getApplicationSupportDirectory();
    final dbPath = p.join(supportDir.path, _dbFileName);

    if (!await File(dbPath).exists()) {
      await _copyFromAsset(dbPath);
    }

    final db = await openDatabase(
      dbPath,
      version: 2,
      onConfigure: (db) async {
        await db.execute('PRAGMA foreign_keys = ON;');
      },
      onCreate: (db, version) async {
        await _createTables(db);
        await _seedDevotionals(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        await _createTables(db);
        await _seedDevotionals(db);
      },
    );

    // Garante que tabelas existam
    await _createTables(db);
    await _seedDevotionals(db);

    return db;
  }

  Future<void> _copyFromAsset(String destPath) async {
    try {
      final byteData = await rootBundle.load(_assetDbPath);
      final bytes = byteData.buffer.asUint8List(
        byteData.offsetInBytes,
        byteData.lengthInBytes,
      );
      final file = File(destPath);
      await file.create(recursive: true);
      await file.writeAsBytes(bytes, flush: true);
    } catch (e) {
      debugPrint('Erro ao copiar banco dos assets: $e');
      rethrow;
    }
  }

  Future<void> _createTables(Database db) async {
    // 1. Controle de Progresso de Leitura por Capítulo
    await db.execute('''
      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        book_id INT NOT NULL,
        chapter INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, chapter)
      );
    ''');

    // 2. Sistema de Destaques em Cores
    await db.execute('''
      CREATE TABLE IF NOT EXISTS user_highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        book_id INT NOT NULL,
        chapter INT NOT NULL,
        verse INT NOT NULL,
        start_offset INT NOT NULL DEFAULT 0,
        end_offset INT NOT NULL DEFAULT 0,
        color VARCHAR(20) NOT NULL CHECK (color IN ('verde', 'amarelo', 'azul', 'laranja', 'rosa')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, chapter, verse)
      );
    ''');

    // 3. Acervo de Devocionais (Inspiração Monergismo)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS devotionals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        bible_reference VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        source_author VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    ''');

    // 4. Mural de Orações do Usuário
    await db.execute('''
      CREATE TABLE IF NOT EXISTS user_prayers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'respondido')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answered_at TIMESTAMP
      );
    ''');

    // Índices de alta performance
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id, book_id);',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_highlights_user_chap ON user_highlights(user_id, book_id, chapter);',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_prayers_user ON user_prayers(user_id, status);',
    );
  }

  Future<void> _seedDevotionals(Database db) async {
    final count = Sqflite.firstIntValue(
      await db.rawQuery('SELECT COUNT(*) FROM devotionals;'),
    ) ?? 0;

    if (count > 0) return;

    final now = DateTime.now();
    final formatter = DateFormat('yyyy-MM-dd');

    final sampleDevotionals = [
      {
        'daysAgo': 0, // Hoje
        'title': 'A Glória da Justificação Pela Fé',
        'bible_reference': 'Romanos 5:1',
        'author': 'Charles H. Spurgeon',
        'content': '''Sendo, pois, justificados pela fé, temos paz com Deus, por nosso Senhor Jesus Cristo.

Que oceano de consolo há nesta única sentença! A paz não é uma trégua temporária, nem uma calmaria enganosa antes da tempestade; é a reconciliação definitiva e eterna selada pelo sangue do Cordeiro. O pecador que confia em Cristo não tem mais contra si qualquer acusação ou condenação perante o tribunal divino. A lei de Deus foi satisfeita, a justiça foi vindicada e a ira de Deus foi propiciada no Calvário.

Ó minh'alma, descansa na perfeita justiça de teu Redentor! Não olhes para tuas imperfeições para encontrar segurança, mas fixa os olhos nas chagas e na fidelidade de Cristo. Em Cristo, tu estás tão seguro quanto Ele está na glória celestial. Vivamos hoje desfrutando desta doce paz com nosso Criador e Pai.''',
      },
      {
        'daysAgo': 1, // Ontem
        'title': 'O Mistério da Soberana Providência',
        'bible_reference': 'Romanos 8:28',
        'author': 'Thomas Watson',
        'content': '''Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.

O grande Médico das almas sabe preparar a mais amarga receita para produzir a mais doce cura. Nem sempre compreendemos o propósito de nossas aflições enquanto estamos no vale, mas Deus opera soberanamente nos bastidores. As linhas escuras da tapeçaria da vida são tão necessárias para compor o belo desenho quanto os fios de ouro.

Nenhum fio de cabelo cai de tua cabeça sem a soberana permissão do teu Pai celestial. O que os homens planejam para o mal, Deus transforma e governa para o bem eterno do Seu povo eleito. Confia nEle mesmo quando o mar rugir e as montanhas se abalarem, pois o leme do universo está nas mãos do Teu Salvador.''',
      },
      {
        'daysAgo': 2,
        'title': 'A Santidade Sem a Qual Ninguém Verá o Senhor',
        'bible_reference': 'Hebreus 12:14',
        'author': 'J.C. Ryle',
        'content': '''Segui a paz com todos, e a santificação, sem a qual ninguém verá o Senhor.

A verdadeira santidade cristã não consiste em mero misticismo, tampouco em um legalismo árido e exterior; é a semelhança real e crescente com o Senhor Jesus Cristo em caráter, palavra e ação. Um homem santo não é perfeito nesta terra, mas ele odeia todo pecado e ama apaixonadamente a justiça e os mandamentos do Senhor.

Não nos enganemos com uma fé morta que não produz frutos de piedade prática. A graça que justifica é a mesma graça que purifica o coração e renova a mente. Examine teu coração: há em ti um anseio sincero por ser puro como Ele é puro? Que o Espírito Santo mortifique em nós todo resquício de carnalidade e nos vista com as vestes formosas da santidade.''',
      },
      {
        'daysAgo': 3,
        'title': 'A Fonte Inabalável da Graça Soberana',
        'bible_reference': 'Efésios 2:8-9',
        'author': 'Arthur W. Pink',
        'content': '''Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus. Não vem das obras, para que ninguém se glorie.

A salvação pertence ao Senhor de ponta a ponta. Não fomos nós que escolhemos a Cristo primeiro quando estávamos mortos em nossos delitos e pecados, mas foi Ele quem nos amou com amor eterno e nos chamou eficazmente das trevas para a Sua maravilhosa luz. A fé salvadora é a dádiva imerecida de um Deus misericordioso.

Onde, pois, está a jactância humana? Excluída inteiramente! A cruz de Cristo destrói todo orgulho e prostra o pecador no pó diante da soberana majestade de Deus. Todo louvor, honra e adoração pertencem unicamente ao Deus Trino que planejou, realizou e aplicou a nossa eterna redenção.''',
      },
      {
        'daysAgo': 4,
        'title': 'A Mortificação Diária do Pecado',
        'bible_reference': 'Romanos 8:13',
        'author': 'John Owen',
        'content': '''Porque, se viverdes segundo a carne, morrereis; mas, se pelo Espírito mortificardes as obras do corpo, vivereis.

Ou estás matando o pecado diariamente, ou o pecado estará matando a ti. O crente em Cristo jamais pode declarar um cessar-fogo contra as concupiscências que ainda habitam na sua natureza caída. Esta batalha espiritual exige vigilância constante, oração fervorosa e dependência absoluta do poder do Espírito Santo.

Não tentes combater o pecado com a tua própria força carnal ou votos frágeis; leva as tuas fraquezas aos pés da cruz de Cristo. Olha para o sofrimento que teu pecado causou ao Filho de Deus e odeia-o com santa aversão. Pelo poder da ressurreição de Cristo, temos poder para triunfar sobre o pecado reinante.''',
      },
      {
        'daysAgo': 5,
        'title': 'A Luz das Escrituras Para os Nossos Passos',
        'bible_reference': 'Salmos 119:105',
        'author': 'João Calvino',
        'content': '''Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.

Assim como os viajantes na escuridão da noite tropeçam e se perdem a cada passo a menos que tenham uma tocha acesa, assim toda a sabedoria humana é pura cegueira se não for iluminada pela luz límpida da Palavra Sagrada de Deus. As Escrituras são os óculos celestiais que nos permitem enxergar claramente tanto a Deus quanto a nós mesmos.

Não busquemos revelações fantásticas fora do cânon sagrado que o Senhor nos legou. Na Bíblia temos o conselho infalível e completo de Deus para a nossa fé e prática. Curva o teu entendimento com reverência diante de cada versículo da Escritura, pois ali fala o Deus todo-poderoso ao coração de Seus filhos amados.''',
      },
      {
        'daysAgo': 6,
        'title': 'A Doçura da Oração Matutina',
        'bible_reference': 'Salmos 5:3',
        'author': 'Matthew Henry',
        'content': '''Pela manhã ouvirás a minha voz, ó SENHOR; pela manhã apresentarei a ti a minha oração, e vigiarei.

Consagrar as primeiras horas do dia ao nosso Criador é como colocar a chave de ouro da manhã nas mãos de Deus para que Ele abra e guarde todas as portas do nosso dia. Antes que os ruídos do mundo invadam os nossos ouvidos, silenciemos o coração na presença dEle.

Apresenta diante do trono da graça as tuas súplicas, tuas ansiedades, teus planos e tua família. E quando orares, vigia em santa expectativa, aguardando com paciência e fé a resposta que o Pai bondoso trará no tempo perfeito de Sua sabedoria.''',
      },
      {
        'daysAgo': 7,
        'title': 'O Bom Pastor que Guarda o Seu Rebanho',
        'bible_reference': 'Salmos 23:1-3',
        'author': 'Charles H. Spurgeon',
        'content': '''O SENHOR é o meu pastor, nada me faltará. Deitar-me faz em verdes pastos, guia-me mansamente a águas tranqüilas. Refrigera a minha alma.

Observe a intimidade e a certeza deste salmo: 'O SENHOR é o MEU pastor'. Não apenas o pastor de Israel ou do mundo, mas o meu Guia, Provedor e Guarda pessoal. Ele me conhece pelo nome, cuida das minhas feridas e me conduz a pastagens de comunhão bendita com a Sua graça.

Ainda que o mundo esteja convulsionado por crises e incertezas, as ovelhas de Cristo estão eternamente seguras no aprisco do Bom Pastor. Nada nos faltará do que seja verdadeiramente bom e necessário para a glória de Deus e nosso bem eterno.''',
      },
    ];

    for (final dev in sampleDevotionals) {
      final daysAgo = dev['daysAgo'] as int;
      final dateStr = formatter.format(now.subtract(Duration(days: daysAgo)));
      await db.insert('devotionals', {
        'date': dateStr,
        'title': dev['title'],
        'bible_reference': dev['bible_reference'],
        'content': dev['content'],
        'source_author': dev['author'],
        'created_at': DateTime.now().toIso8601String(),
      });
    }
  }

  // ==========================================
  // MÉTODOS BÍBLICOS (ACF EXCLUSIVA)
  // ==========================================

  Future<List<Book>> getBooks() async {
    final db = await database;
    final maps = await db.query(
      'books',
      where: 'version = ?',
      whereArgs: ['acf'],
      orderBy: 'order_index ASC',
    );
    return maps.map((m) => Book.fromMap(m)).toList();
  }

  Future<Book?> getBookById(int id) async {
    final db = await database;
    final maps = await db.query(
      'books',
      where: 'id = ? AND version = ?',
      whereArgs: [id, 'acf'],
      limit: 1,
    );
    if (maps.isEmpty) return null;
    return Book.fromMap(maps.first);
  }

  Future<Book?> getBookByAbbr(String abbr) async {
    final db = await database;
    final maps = await db.query(
      'books',
      where: 'abbreviation = ? AND version = ?',
      whereArgs: [abbr.toLowerCase(), 'acf'],
      limit: 1,
    );
    if (maps.isEmpty) return null;
    return Book.fromMap(maps.first);
  }

  Future<List<Verse>> getVerses(int bookId, int chapter) async {
    final db = await database;
    final book = await getBookById(bookId);
    if (book == null) return [];

    final maps = await db.query(
      'verses',
      where: 'version = ? AND book = ? AND chapter = ?',
      whereArgs: ['acf', book.abbreviation, chapter],
      orderBy: 'number ASC',
    );
    return maps.map((m) => Verse.fromMap(m, bookId: bookId)).toList();
  }

  // ==========================================
  // PROGRESSO DE LEITURA (user_progress)
  // ==========================================

  Future<Set<String>> getUserCompletedChapters(String userId) async {
    final db = await database;
    final results = await db.query(
      'user_progress',
      columns: ['book_id', 'chapter'],
      where: 'user_id = ?',
      whereArgs: [userId],
    );
    return results
        .map((r) => '${r['book_id']}_${r['chapter']}')
        .toSet();
  }

  Future<bool> isChapterCompleted(String userId, int bookId, int chapter) async {
    final db = await database;
    final results = await db.query(
      'user_progress',
      where: 'user_id = ? AND book_id = ? AND chapter = ?',
      whereArgs: [userId, bookId, chapter],
      limit: 1,
    );
    return results.isNotEmpty;
  }

  Future<void> markChapterCompleted(String userId, int bookId, int chapter) async {
    final db = await database;
    await db.insert(
      'user_progress',
      {
        'user_id': userId,
        'book_id': bookId,
        'chapter': chapter,
        'completed_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> unmarkChapterCompleted(String userId, int bookId, int chapter) async {
    final db = await database;
    await db.delete(
      'user_progress',
      where: 'user_id = ? AND book_id = ? AND chapter = ?',
      whereArgs: [userId, bookId, chapter],
    );
  }

  Future<int> getTotalCompletedChaptersCount(String userId) async {
    final db = await database;
    return Sqflite.firstIntValue(
      await db.rawQuery(
        'SELECT COUNT(*) FROM user_progress WHERE user_id = ?;',
        [userId],
      ),
    ) ?? 0;
  }

  // ==========================================
  // DESTAQUES DE TEXTO (user_highlights)
  // ==========================================

  Future<List<UserHighlight>> getHighlightsForChapter(
    String userId,
    int bookId,
    int chapter,
  ) async {
    final db = await database;
    final maps = await db.query(
      'user_highlights',
      where: 'user_id = ? AND book_id = ? AND chapter = ?',
      whereArgs: [userId, bookId, chapter],
    );
    return maps.map((m) => UserHighlight.fromMap(m)).toList();
  }

  Future<List<UserHighlight>> getAllUserHighlights(String userId) async {
    final db = await database;
    final maps = await db.rawQuery('''
      SELECT h.*, b.name as book_name, v.text as verse_text
      FROM user_highlights h
      JOIN books b ON b.id = h.book_id AND b.version = 'acf'
      JOIN verses v ON v.book = b.abbreviation AND v.chapter = h.chapter AND v.number = h.verse AND v.version = 'acf'
      WHERE h.user_id = ?
      ORDER BY h.created_at DESC;
    ''', [userId]);
    return maps.map((m) => UserHighlight.fromMap(m)).toList();
  }

  Future<void> saveHighlight(UserHighlight highlight) async {
    final db = await database;
    await db.insert(
      'user_highlights',
      highlight.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> removeHighlight(String userId, int bookId, int chapter, int verse) async {
    final db = await database;
    await db.delete(
      'user_highlights',
      where: 'user_id = ? AND book_id = ? AND chapter = ? AND verse = ?',
      whereArgs: [userId, bookId, chapter, verse],
    );
  }

  // ==========================================
  // DEVOCIONAIS (devotionals)
  // ==========================================

  Future<List<Devotional>> getDevotionals() async {
    final db = await database;
    final maps = await db.query(
      'devotionals',
      orderBy: 'date DESC',
    );
    return maps.map((m) => Devotional.fromMap(m)).toList();
  }

  Future<Devotional?> getDevotionalByDate(String date) async {
    final db = await database;
    final maps = await db.query(
      'devotionals',
      where: 'date = ?',
      whereArgs: [date],
      limit: 1,
    );
    if (maps.isEmpty) {
      // Retorna o devocional mais recente caso não haja exato para o dia
      final all = await getDevotionals();
      return all.isNotEmpty ? all.first : null;
    }
    return Devotional.fromMap(maps.first);
  }

  // ==========================================
  // MURAL DE ORAÇÕES (user_prayers)
  // ==========================================

  Future<List<UserPrayer>> getPrayers(String userId, {String? status}) async {
    final db = await database;
    String? whereClause = 'user_id = ?';
    List<dynamic> whereArgs = [userId];

    if (status != null) {
      whereClause += ' AND status = ?';
      whereArgs.add(status);
    }

    final maps = await db.query(
      'user_prayers',
      where: whereClause,
      whereArgs: whereArgs,
      orderBy: 'created_at DESC',
    );
    return maps.map((m) => UserPrayer.fromMap(m)).toList();
  }

  Future<int> insertPrayer(UserPrayer prayer) async {
    final db = await database;
    return await db.insert('user_prayers', prayer.toMap());
  }

  Future<void> updatePrayer(UserPrayer prayer) async {
    final db = await database;
    await db.update(
      'user_prayers',
      prayer.toMap(),
      where: 'id = ?',
      whereArgs: [prayer.id],
    );
  }

  Future<void> markPrayerAnswered(int id) async {
    final db = await database;
    await db.update(
      'user_prayers',
      {
        'status': 'respondido',
        'answered_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> reopenPrayer(int id) async {
    final db = await database;
    await db.update(
      'user_prayers',
      {
        'status': 'ativo',
        'answered_at': null,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> deletePrayer(int id) async {
    final db = await database;
    await db.delete(
      'user_prayers',
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
