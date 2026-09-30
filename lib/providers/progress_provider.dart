import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/database/database_helper.dart';
import 'user_provider.dart';

// Conjunto de chaves de capítulos concluídos no formato "bookId_chapter"
final userProgressProvider =
    StateNotifierProvider<UserProgressNotifier, Set<String>>((ref) {
  final user = ref.watch(userProfileProvider);
  return UserProgressNotifier(user.userId);
});

class UserProgressNotifier extends StateNotifier<Set<String>> {
  final String userId;

  UserProgressNotifier(this.userId) : super({}) {
    if (userId.isNotEmpty) {
      loadProgress();
    }
  }

  Future<void> loadProgress() async {
    if (userId.isEmpty) return;
    final set = await DatabaseHelper.instance.getUserCompletedChapters(userId);
    state = set;
  }

  bool isCompleted(int bookId, int chapter) {
    return state.contains('${bookId}_$chapter');
  }

  Future<bool> markCompleted(int bookId, int chapter) async {
    final key = '${bookId}_$chapter';
    if (state.contains(key)) return false; // Já estava concluído

    await DatabaseHelper.instance.markChapterCompleted(userId, bookId, chapter);
    state = {...state, key};
    return true; // Acabou de ser concluído
  }

  Future<void> unmarkCompleted(int bookId, int chapter) async {
    final key = '${bookId}_$chapter';
    if (!state.contains(key)) return;

    await DatabaseHelper.instance.unmarkChapterCompleted(userId, bookId, chapter);
    final newSet = Set<String>.from(state)..remove(key);
    state = newSet;
  }

  Future<void> toggleCompleted(int bookId, int chapter) async {
    if (isCompleted(bookId, chapter)) {
      await unmarkCompleted(bookId, chapter);
    } else {
      await markCompleted(bookId, chapter);
    }
  }
}

// ==========================================
// SCROLL OBSERVER & DWELL TIME TRACKER
// ==========================================

class ChapterReadingTrackerState {
  final int bookId;
  final int chapter;
  final DateTime startTime;
  final bool reachedBottom;
  final bool completedRecorded;

  const ChapterReadingTrackerState({
    required this.bookId,
    required this.chapter,
    required this.startTime,
    this.reachedBottom = false,
    this.completedRecorded = false,
  });

  ChapterReadingTrackerState copyWith({
    int? bookId,
    int? chapter,
    DateTime? startTime,
    bool? reachedBottom,
    bool? completedRecorded,
  }) {
    return ChapterReadingTrackerState(
      bookId: bookId ?? this.bookId,
      chapter: chapter ?? this.chapter,
      startTime: startTime ?? this.startTime,
      reachedBottom: reachedBottom ?? this.reachedBottom,
      completedRecorded: completedRecorded ?? this.completedRecorded,
    );
  }
}

final chapterTrackerProvider = StateNotifierProvider.family<
    ChapterTrackerNotifier, ChapterReadingTrackerState, (int, int)>((ref, args) {
  final (bookId, chapter) = args;
  return ChapterTrackerNotifier(ref, bookId, chapter);
});

class ChapterTrackerNotifier extends StateNotifier<ChapterReadingTrackerState> {
  final Ref ref;
  static const int minDwellSeconds = 15; // Tempo mínimo de leitura (15 segundos)
  Timer? _dwellCheckTimer;

  ChapterTrackerNotifier(this.ref, int bookId, int chapter)
      : super(ChapterReadingTrackerState(
          bookId: bookId,
          chapter: chapter,
          startTime: DateTime.now(),
        )) {
    _startTimer();
  }

  void _startTimer() {
    _dwellCheckTimer?.cancel();
    _dwellCheckTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.completedRecorded) {
        timer.cancel();
        return;
      }
      _checkCompletionCondition();
    });
  }

  /// Observador de Rolagem (Scroll Notification)
  void onScroll(ScrollNotification notification) {
    if (state.completedRecorded) return;

    if (notification.metrics.maxScrollExtent > 0) {
      // Checa se o usuário rolou até o final (tolerância de 50px)
      final atBottom = notification.metrics.pixels >=
          notification.metrics.maxScrollExtent - 50;

      if (atBottom && !state.reachedBottom) {
        state = state.copyWith(reachedBottom: true);
        _checkCompletionCondition();
      }
    }
  }

  void _checkCompletionCondition() {
    if (state.completedRecorded) return;

    final secondsElapsed =
        DateTime.now().difference(state.startTime).inSeconds;

    // Regra: Rolagem concluída + Tempo mínimo de permanência
    if (state.reachedBottom && secondsElapsed >= minDwellSeconds) {
      state = state.copyWith(completedRecorded: true);
      _dwellCheckTimer?.cancel();

      // Registra no banco
      final progressNotifier = ref.read(userProgressProvider.notifier);
      progressNotifier.markCompleted(state.bookId, state.chapter);
    }
  }

  @override
  void dispose() {
    _dwellCheckTimer?.cancel();
    super.dispose();
  }
}
