import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/verse.dart';
import '../../domain/models/book.dart';
import '../../providers/bible_provider.dart';
import '../../providers/progress_provider.dart';
import '../../providers/highlights_provider.dart';
import 'widgets/book_chapter_picker.dart';
import 'widgets/highlight_selector_sheet.dart';
import 'widgets/reader_settings_sheet.dart';

class ReaderScreen extends ConsumerStatefulWidget {
  const ReaderScreen({super.key});

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToTop() {
    if (_scrollController.hasClients) {
      _scrollController.jumpTo(0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final book = ref.watch(currentBookProvider);
    final chapter = ref.watch(currentChapterProvider);
    final versesAsync = ref.watch(currentVersesProvider);
    final highlights = ref.watch(chapterHighlightsProvider);
    final progress = ref.watch(userProgressProvider);
    final fontSize = ref.watch(fontSizeProvider);
    final isSerif = ref.watch(isSerifProvider);
    final readingTheme = ref.watch(readingThemeProvider);

    final isCompleted = book != null && progress.contains('${book.id}_$chapter');

    // Inicializa o tracker de rolagem e tempo para o capítulo ativo
    final tracker = book != null
        ? ref.watch(chapterTrackerProvider((book.id, chapter)))
        : null;

    return Scaffold(
      appBar: AppBar(
        title: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () {
            showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              builder: (ctx) => const BookChapterPickerModal(),
            );
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  book != null ? '${book.name} $chapter' : 'Carregando...',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_drop_down, size: 22),
              ],
            ),
          ),
        ),
        actions: [
          // Botão indicador / alternador de Conclusão do Capítulo
          IconButton(
            tooltip: isCompleted ? 'Capítulo Concluído' : 'Marcar como Concluído',
            icon: Icon(
              isCompleted ? Icons.check_circle : Icons.check_circle_outline,
              color: isCompleted ? const Color(0xFF10B981) : Colors.grey,
            ),
            onPressed: () {
              if (book != null) {
                ref.read(userProgressProvider.notifier).toggleCompleted(book.id, chapter);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      isCompleted
                          ? 'Capítulo marcado como não lido'
                          : 'Capítulo marcado como concluído! ✓',
                    ),
                    duration: const Duration(seconds: 2),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
          ),

          // Ajustes do leitor (Tamanho de fonte e Tema)
          IconButton(
            tooltip: 'Ajustes de Leitura',
            icon: const Icon(Icons.format_size_rounded),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                builder: (ctx) => const ReaderSettingsSheet(),
              );
            },
          ),
        ],
      ),
      body: book == null
          ? const Center(child: CircularProgressIndicator())
          : NotificationListener<ScrollNotification>(
              onNotification: (notification) {
                // Notifica o observador de rolagem para verificação de leitura automática
                ref
                    .read(chapterTrackerProvider((book.id, chapter)).notifier)
                    .onScroll(notification);
                return false;
              },
              child: versesAsync.when(
                data: (verses) {
                  if (verses.isEmpty) {
                    return const Center(child: Text('Nenhum versículo encontrado.'));
                  }

                  return Column(
                    children: [
                      // Banner sutil quando o capítulo for concluído automaticamente
                      if (tracker != null && tracker.completedRecorded)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                          color: const Color(0xFFD1FAE5),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle, size: 16, color: Color(0xFF047857)),
                              SizedBox(width: 8),
                              Text(
                                'Leitura do capítulo registrada com sucesso!',
                                style: TextStyle(
                                  color: Color(0xFF047857),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),

                      Expanded(
                        child: ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                          itemCount: verses.length + 1, // +1 para barra de navegação no final
                          itemBuilder: (context, index) {
                            if (index == verses.length) {
                              return _buildChapterFooter(book, chapter, isCompleted);
                            }

                            final verse = verses[index];
                            final highlight = highlights[verse.number];

                            return _buildVerseTile(
                              context: context,
                              book: book,
                              verse: verse,
                              highlight: highlight,
                              fontSize: fontSize,
                              isSerif: isSerif,
                              theme: readingTheme,
                            );
                          },
                        ),
                      ),
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Center(child: Text('Erro ao carregar versículos: $err')),
              ),
            ),
    );
  }

  Widget _buildVerseTile({
    required BuildContext context,
    required Book book,
    required Verse verse,
    required dynamic highlight,
    required double fontSize,
    required bool isSerif,
    required ReadingTheme theme,
  }) {
    Color? highlightBgColor;
    if (highlight != null) {
      final colorData = AppColors.highlights[highlight.color];
      if (colorData != null) {
        highlightBgColor = colorData.getBackgroundColor(
          Theme.of(context).brightness,
          isSepia: theme == ReadingTheme.sepia,
        );
      }
    }

    return InkWell(
      borderRadius: BorderRadius.circular(6),
      onTap: () {
        showModalBottomSheet(
          context: context,
          builder: (ctx) => HighlightSelectorSheet(
            book: book,
            verse: verse,
            currentHighlight: highlight,
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
        margin: const EdgeInsets.symmetric(vertical: 2),
        decoration: BoxDecoration(
          color: highlightBgColor,
          borderRadius: BorderRadius.circular(6),
        ),
        child: RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: '${verse.number} ',
                style: TextStyle(
                  fontSize: fontSize * 0.75,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryBurgundy,
                  fontFeatures: const [FontFeature.superscripts()],
                ),
              ),
              TextSpan(
                text: verse.text,
                style: TextStyle(
                  fontSize: fontSize,
                  height: 1.65,
                  letterSpacing: 0.2,
                  fontFamily: isSerif ? 'serif' : 'sans-serif',
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChapterFooter(Book book, int chapter, bool isCompleted) {
    final hasPrev = chapter > 1;
    final hasNext = chapter < book.chapterCount;

    return Padding(
      padding: const EdgeInsets.only(top: 32, bottom: 48),
      child: Column(
        children: [
          const Divider(),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (hasPrev)
                OutlinedButton.icon(
                  icon: const Icon(Icons.chevron_left),
                  label: Text('Capítulo ${chapter - 1}'),
                  onPressed: () {
                    ref.read(currentChapterProvider.notifier).setChapter(chapter - 1);
                    _scrollToTop();
                  },
                )
              else
                const SizedBox.shrink(),
              if (hasNext)
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primaryBurgundy,
                  ),
                  icon: const Icon(Icons.chevron_right),
                  label: Text('Capítulo ${chapter + 1}'),
                  onPressed: () {
                    ref.read(currentChapterProvider.notifier).setChapter(chapter + 1);
                    _scrollToTop();
                  },
                )
              else
                const SizedBox.shrink(),
            ],
          ),
        ],
      ),
    );
  }
}
