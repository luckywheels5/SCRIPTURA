import 'package:flutter_test/flutter_test.dart';
import 'package:scriptura_app/core/constants/app_colors.dart';
import 'package:scriptura_app/domain/models/book.dart';
import 'package:scriptura_app/domain/models/devotional.dart';
import 'package:scriptura_app/domain/models/user_highlight.dart';
import 'package:scriptura_app/domain/models/user_prayer.dart';
import 'package:scriptura_app/domain/models/user_progress.dart';

void main() {
  group('Modelos do Domínio Scriptura App', () {
    test('Book identifica corretamente AT e NT', () {
      const genesis = Book(
        id: 1,
        abbreviation: 'gn',
        name: 'Gênesis',
        testament: 'at',
        chapterCount: 50,
        orderIndex: 0,
      );

      const mateus = Book(
        id: 40,
        abbreviation: 'mt',
        name: 'Mateus',
        testament: 'nt',
        chapterCount: 28,
        orderIndex: 39,
      );

      expect(genesis.isOldTestament, isTrue);
      expect(genesis.isNewTestament, isFalse);
      expect(mateus.isOldTestament, isFalse);
      expect(mateus.isNewTestament, isTrue);
    });

    test('UserHighlight suporta as 5 cores oficiais da especificação', () {
      final validColors = ['verde', 'amarelo', 'azul', 'laranja', 'rosa'];
      for (final color in validColors) {
        expect(AppColors.highlights.containsKey(color), isTrue);

        final hl = UserHighlight(
          userId: 'test-uuid-123',
          bookId: 1,
          chapter: 1,
          verse: 1,
          color: color,
          createdAt: DateTime.now(),
        );

        final map = hl.toMap();
        expect(map['color'], color);
        expect(map['verse'], 1);

        final parsed = UserHighlight.fromMap(map);
        expect(parsed.color, color);
      }
    });

    test('UserPrayer gerencia transição de status ativo para respondido', () {
      final prayer = UserPrayer(
        userId: 'test-uuid',
        title: 'Crescimento na santificação',
        description: 'Orar por vitória sobre o pecado',
        createdAt: DateTime.now(),
      );

      expect(prayer.isActive, isTrue);
      expect(prayer.isAnswered, isFalse);

      final answered = prayer.copyWith(
        status: 'respondido',
        answeredAt: DateTime.now(),
      );

      expect(answered.isActive, isFalse);
      expect(answered.isAnswered, isTrue);
      expect(answered.answeredAt, isNotNull);
    });

    test('UserProgress armazena conclusão do capítulo', () {
      final progress = UserProgress(
        userId: 'user-456',
        bookId: 45, // Romanos
        chapter: 8,
        completedAt: DateTime.now(),
      );

      final map = progress.toMap();
      expect(map['book_id'], 45);
      expect(map['chapter'], 8);
    });

    test('Devotional possui autoria e referência bíblica da versão ACF', () {
      final dev = Devotional(
        date: '2026-09-30',
        title: 'A Segurança Eterna dos Eleitos',
        bibleReference: 'Romanos 8:38-39',
        content: 'Nada nos separará do amor de Deus...',
        sourceAuthor: 'Charles H. Spurgeon',
        createdAt: DateTime.now(),
      );

      expect(dev.sourceAuthor, 'Charles H. Spurgeon');
      expect(dev.bibleReference, 'Romanos 8:38-39');
    });
  });
}
