import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../domain/models/devotional.dart';
import '../../providers/bible_provider.dart';

class DevotionalDetailScreen extends ConsumerWidget {
  final Devotional devotional;
  final VoidCallback? onNavigateToBible;

  const DevotionalDetailScreen({
    super.key,
    required this.devotional,
    this.onNavigateToBible,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Devocional Reformado'),
        actions: [
          IconButton(
            tooltip: 'Ir para a Bíblia ACF',
            icon: const Icon(Icons.menu_book_rounded),
            onPressed: () {
              _openPassageInBible(context, ref, devotional.bibleReference);
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Data e Autor
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primaryBurgundy.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    devotional.date,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryBurgundy,
                    ),
                  ),
                ),
                if (devotional.sourceAuthor != null)
                  Text(
                    devotional.sourceAuthor!,
                    style: const TextStyle(
                      fontSize: 14,
                      fontStyle: FontStyle.italic,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            // Título
            Text(
              devotional.title,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                height: 1.25,
                color: AppColors.primaryBurgundy,
              ),
            ),
            const SizedBox(height: 16),

            // Passagem Base Card
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () {
                _openPassageInBible(context, ref, devotional.bibleReference);
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.goldAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.goldAccent.withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.bookmark_added_rounded, color: AppColors.goldAccent),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'TEXTO BÍBLICO BASE (ACF)',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                              color: AppColors.goldAccent,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            devotional.bibleReference,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Text(
                      'Ler na Bíblia →',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryBurgundy,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Conteúdo Devocional
            Text(
              devotional.content,
              style: const TextStyle(
                fontSize: 17,
                height: 1.7,
                fontFamily: 'serif',
                letterSpacing: 0.2,
              ),
            ),

            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 16),

            // Rodapé com citação de inspiração
            Center(
              child: Text(
                'Inspirado no acervo clássico da teologia reformada e Monergismo',
                style: TextStyle(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  color: Colors.grey.withValues(alpha: 0.8),
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  void _openPassageInBible(
    BuildContext context,
    WidgetRef ref,
    String reference,
  ) async {
    // Tenta encontrar o livro e capítulo da referência (ex: "Romanos 8:28" ou "Salmos 23:1-3")
    final parts = reference.trim().split(' ');
    if (parts.isNotEmpty) {
      String bookName = parts[0];
      int chapterNum = 1;

      // Trata livros como "1 Samuel", "2 Coríntios", etc.
      if (parts.length > 2 && int.tryParse(parts[0]) != null) {
        bookName = '${parts[0]} ${parts[1]}';
        final chapVerse = parts[2].split(':');
        chapterNum = int.tryParse(chapVerse[0]) ?? 1;
      } else if (parts.length >= 2) {
        final chapVerse = parts[1].split(':');
        chapterNum = int.tryParse(chapVerse[0]) ?? 1;
      }

      final books = await ref.read(booksListProvider.future);
      final foundBook = books.firstWhere(
        (b) =>
            b.name.toLowerCase().contains(bookName.toLowerCase()) ||
            bookName.toLowerCase().contains(b.name.toLowerCase()),
        orElse: () => books.first,
      );

      ref.read(currentBookProvider.notifier).selectBook(foundBook);
      ref.read(currentChapterProvider.notifier).setChapter(chapterNum);

      if (context.mounted) {
        Navigator.pop(context); // Fecha o detalhe se estava nele
        if (onNavigateToBible != null) {
          onNavigateToBible!();
        }
      }
    }
  }
}
