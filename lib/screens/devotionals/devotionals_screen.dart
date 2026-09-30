import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../domain/models/devotional.dart';
import '../../providers/bible_provider.dart';
import '../../providers/devotionals_provider.dart';
import 'devotional_detail_screen.dart';

class DevotionalsScreen extends ConsumerWidget {
  final VoidCallback onNavigateToBible;

  const DevotionalsScreen({
    super.key,
    required this.onNavigateToBible,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final devotionalsAsync = ref.watch(devotionalsListProvider);
    final todayDevotionalAsync = ref.watch(todayDevotionalProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Devocionais'),
        centerTitle: true,
      ),
      body: devotionalsAsync.when(
        data: (devotionals) {
          if (devotionals.isEmpty) {
            return const Center(child: Text('Nenhum devocional disponível no momento.'));
          }

          final todayDevotional = todayDevotionalAsync.asData?.value ?? devotionals.first;
          final pastDevotionals = devotionals.where((d) => d.id != todayDevotional.id).toList();

          return ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            children: [
              // Banner Inspirador
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primaryDarkBurgundy, AppColors.primaryBurgundy],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryBurgundy.withValues(alpha: 0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.goldAccent,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'SOLA SCRIPTURA',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              letterSpacing: 1.0,
                            ),
                          ),
                        ),
                        const Spacer(),
                        const Text(
                          'Acervo Monergismo',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Reflexões Diárias nas Escrituras',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Alimentando a fé reformada com fidelidade à Palavra de Deus na versão ACF.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white70,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // DEVOCIONAL DO DIA
              const Row(
                children: [
                  Icon(Icons.today_rounded, size: 20, color: AppColors.primaryBurgundy),
                  SizedBox(width: 8),
                  Text(
                    'DEVOCIONAL DO DIA',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                      color: AppColors.primaryBurgundy,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              _buildFeaturedCard(context, ref, todayDevotional),

              const SizedBox(height: 28),

              // HISTÓRICO DE DEVOCIONAIS
              const Row(
                children: [
                  Icon(Icons.history_edu_rounded, size: 20, color: Colors.grey),
                  SizedBox(width: 8),
                  Text(
                    'ACERVO E REFLEXÕES ANTERIORES',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              ...pastDevotionals.map((dev) => _buildListItem(context, ref, dev)),
              const SizedBox(height: 32),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Erro ao carregar devocionais: $err')),
      ),
    );
  }

  Widget _buildFeaturedCard(BuildContext context, WidgetRef ref, Devotional dev) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.goldAccent.withValues(alpha: 0.3)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (ctx) => DevotionalDetailScreen(
                devotional: dev,
                onNavigateToBible: onNavigateToBible,
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    dev.date,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryBurgundy,
                    ),
                  ),
                  if (dev.sourceAuthor != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.grey.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        dev.sourceAuthor!,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                dev.title,
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.goldAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '📖 Passagem: ${dev.bibleReference} (ACF)',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.goldAccent,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                dev.content,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    icon: const Icon(Icons.menu_book_rounded, size: 16),
                    label: const Text('Abrir na Bíblia'),
                    onPressed: () {
                      _openPassage(context, ref, dev.bibleReference);
                    },
                  ),
                  FilledButton.tonal(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (ctx) => DevotionalDetailScreen(
                            devotional: dev,
                            onNavigateToBible: onNavigateToBible,
                          ),
                        ),
                      );
                    },
                    child: const Text('Ler Completo →'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildListItem(BuildContext context, WidgetRef ref, Devotional dev) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(
          dev.title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              '${dev.sourceAuthor ?? "Autor Reformado"} • ${dev.bibleReference}',
              style: const TextStyle(fontSize: 13, color: Colors.grey),
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (ctx) => DevotionalDetailScreen(
                devotional: dev,
                onNavigateToBible: onNavigateToBible,
              ),
            ),
          );
        },
      ),
    );
  }

  void _openPassage(
    BuildContext context,
    WidgetRef ref,
    String reference,
  ) async {
    final parts = reference.trim().split(' ');
    if (parts.isNotEmpty) {
      String bookName = parts[0];
      int chapterNum = 1;

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

      onNavigateToBible();
    }
  }
}
