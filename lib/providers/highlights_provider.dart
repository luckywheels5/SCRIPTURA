import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/database/database_helper.dart';
import '../domain/models/user_highlight.dart';
import 'user_provider.dart';
import 'bible_provider.dart';

// Destaques do capítulo atual indexados por número de versículo
final chapterHighlightsProvider =
    StateNotifierProvider<ChapterHighlightsNotifier, Map<int, UserHighlight>>(
        (ref) {
  final user = ref.watch(userProfileProvider);
  final book = ref.watch(currentBookProvider);
  final chapter = ref.watch(currentChapterProvider);

  return ChapterHighlightsNotifier(user.userId, book?.id ?? 1, chapter);
});

class ChapterHighlightsNotifier
    extends StateNotifier<Map<int, UserHighlight>> {
  final String userId;
  final int bookId;
  final int chapter;

  ChapterHighlightsNotifier(this.userId, this.bookId, this.chapter)
      : super({}) {
    if (userId.isNotEmpty) {
      loadChapterHighlights();
    }
  }

  Future<void> loadChapterHighlights() async {
    final list = await DatabaseHelper.instance.getHighlightsForChapter(
      userId,
      bookId,
      chapter,
    );
    final map = <int, UserHighlight>{};
    for (final h in list) {
      map[h.verse] = h;
    }
    state = map;
  }

  Future<void> setHighlight({
    required int verse,
    required String color,
    int startOffset = 0,
    int endOffset = 0,
  }) async {
    final highlight = UserHighlight(
      userId: userId,
      bookId: bookId,
      chapter: chapter,
      verse: verse,
      startOffset: startOffset,
      endOffset: endOffset,
      color: color,
      createdAt: DateTime.now(),
    );

    await DatabaseHelper.instance.saveHighlight(highlight);
    state = {...state, verse: highlight};
  }

  Future<void> removeHighlight(int verse) async {
    await DatabaseHelper.instance.removeHighlight(userId, bookId, chapter, verse);
    final newMap = Map<int, UserHighlight>.from(state)..remove(verse);
    state = newMap;
  }
}

// Lista global de todos os destaques do usuário
final allUserHighlightsProvider =
    FutureProvider.autoDispose<List<UserHighlight>>((ref) async {
  final user = ref.watch(userProfileProvider);
  if (user.userId.isEmpty) return [];
  // Recarrega sempre que os destaques do capítulo mudarem
  ref.watch(chapterHighlightsProvider);
  return await DatabaseHelper.instance.getAllUserHighlights(user.userId);
});
