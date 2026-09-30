import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/theme/app_theme.dart';
import '../data/database/database_helper.dart';
import '../domain/models/book.dart';
import '../domain/models/verse.dart';

const String _prefLastBookIdKey = 'scriptura_last_book_id';
const String _prefLastChapterKey = 'scriptura_last_chapter';
const String _prefFontSizeKey = 'scriptura_font_size';
const String _prefIsSerifKey = 'scriptura_is_serif';
const String _prefThemeKey = 'scriptura_reading_theme';

final booksListProvider = FutureProvider<List<Book>>((ref) async {
  return await DatabaseHelper.instance.getBooks();
});

class CurrentBookNotifier extends StateNotifier<Book?> {
  CurrentBookNotifier() : super(null);

  Future<void> init(List<Book> books) async {
    if (books.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final savedBookId = prefs.getInt(_prefLastBookIdKey) ?? 1;
    final found = books.firstWhere(
      (b) => b.id == savedBookId,
      orElse: () => books.first,
    );
    state = found;
  }

  void selectBook(Book book) {
    state = book;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setInt(_prefLastBookIdKey, book.id);
    });
  }
}

final currentBookProvider =
    StateNotifierProvider<CurrentBookNotifier, Book?>((ref) {
  return CurrentBookNotifier();
});

class CurrentChapterNotifier extends StateNotifier<int> {
  CurrentChapterNotifier() : super(1);

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getInt(_prefLastChapterKey) ?? 1;
    state = saved;
  }

  void setChapter(int chapter) {
    state = chapter;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setInt(_prefLastChapterKey, chapter);
    });
  }
}

final currentChapterProvider =
    StateNotifierProvider<CurrentChapterNotifier, int>((ref) {
  return CurrentChapterNotifier();
});

final currentVersesProvider = FutureProvider<List<Verse>>((ref) async {
  final currentBook = ref.watch(currentBookProvider);
  final currentChapter = ref.watch(currentChapterProvider);

  if (currentBook == null) return [];
  return await DatabaseHelper.instance.getVerses(currentBook.id, currentChapter);
});

// ==========================================
// CONFIGURAÇÕES VISUAIS DO LEITOR
// ==========================================

class FontSizeNotifier extends StateNotifier<double> {
  FontSizeNotifier() : super(18.0) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getDouble(_prefFontSizeKey) ?? 18.0;
  }

  void setSize(double size) {
    state = size;
    SharedPreferences.getInstance().then((p) => p.setDouble(_prefFontSizeKey, size));
  }
}

final fontSizeProvider = StateNotifierProvider<FontSizeNotifier, double>((ref) {
  return FontSizeNotifier();
});

class IsSerifNotifier extends StateNotifier<bool> {
  IsSerifNotifier() : super(true) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getBool(_prefIsSerifKey) ?? true;
  }

  void toggle() {
    state = !state;
    SharedPreferences.getInstance().then((p) => p.setBool(_prefIsSerifKey, state));
  }
}

final isSerifProvider = StateNotifierProvider<IsSerifNotifier, bool>((ref) {
  return IsSerifNotifier();
});

class ReadingThemeNotifier extends StateNotifier<ReadingTheme> {
  ReadingThemeNotifier() : super(ReadingTheme.light) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final idx = prefs.getInt(_prefThemeKey) ?? 0;
    if (idx >= 0 && idx < ReadingTheme.values.length) {
      state = ReadingTheme.values[idx];
    }
  }

  void setTheme(ReadingTheme theme) {
    state = theme;
    SharedPreferences.getInstance().then((p) => p.setInt(_prefThemeKey, theme.index));
  }
}

final readingThemeProvider =
    StateNotifierProvider<ReadingThemeNotifier, ReadingTheme>((ref) {
  return ReadingThemeNotifier();
});
