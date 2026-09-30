import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../domain/models/book.dart';
import '../../../providers/bible_provider.dart';
import '../../../providers/progress_provider.dart';

class BookChapterPickerModal extends ConsumerStatefulWidget {
  const BookChapterPickerModal({super.key});

  @override
  ConsumerState<BookChapterPickerModal> createState() =>
      _BookChapterPickerModalState();
}

class _BookChapterPickerModalState extends ConsumerState<BookChapterPickerModal>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Book? _selectedBook;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Inicializa o livro selecionado com o livro atual do leitor
    _selectedBook = ref.read(currentBookProvider);
    if (_selectedBook != null && _selectedBook!.isNewTestament) {
      _tabController.index = 1;
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final booksAsync = ref.watch(booksListProvider);
    final completedChapters = ref.watch(userProgressProvider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.82,
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: booksAsync.when(
        data: (books) {
          final otBooks = books.where((b) => b.isOldTestament).toList();
          final ntBooks = books.where((b) => b.isNewTestament).toList();

          return Column(
            children: [
              // Barra de arrasto
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Cabeçalho
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    if (_selectedBook != null)
                      IconButton(
                        icon: const Icon(Icons.arrow_back),
                        onPressed: () {
                          setState(() {
                            _selectedBook = null;
                          });
                        },
                      ),
                    Expanded(
                      child: Text(
                        _selectedBook == null
                            ? 'Livros das Escrituras (ACF)'
                            : '${_selectedBook!.name} — Selecionar Capítulo',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryBurgundy,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Se nenhum livro estiver em modo de seleção de capítulos, mostra lista de livros com abas
              if (_selectedBook == null) ...[
                TabBar(
                  controller: _tabController,
                  labelColor: AppColors.primaryBurgundy,
                  unselectedLabelColor: Colors.grey,
                  indicatorColor: AppColors.primaryBurgundy,
                  indicatorWeight: 3,
                  tabs: const [
                    Tab(text: 'Antigo Testamento (39)'),
                    Tab(text: 'Novo Testamento (27)'),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildBookList(otBooks, completedChapters),
                      _buildBookList(ntBooks, completedChapters),
                    ],
                  ),
                ),
              ] else ...[
                // Grade de capítulos do livro selecionado
                Expanded(
                  child: _buildChapterGrid(_selectedBook!, completedChapters),
                ),
              ],
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Erro ao carregar livros: $err')),
      ),
    );
  }

  Widget _buildBookList(List<Book> books, Set<String> completedChapters) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: books.length,
      separatorBuilder: (_, __) => const Divider(height: 1, indent: 16, endIndent: 16),
      itemBuilder: (context, index) {
        final book = books[index];
        // Calcula quantos capítulos desse livro foram concluídos
        int completedCount = 0;
        for (int c = 1; c <= book.chapterCount; c++) {
          if (completedChapters.contains('${book.id}_$c')) {
            completedCount++;
          }
        }
        final isAllCompleted = completedCount == book.chapterCount && book.chapterCount > 0;

        return ListTile(
          title: Text(
            book.name,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          subtitle: Text('${book.chapterCount} capítulos'),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (completedCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: isAllCompleted
                        ? const Color(0xFF10B981).withValues(alpha: 0.15)
                        : Colors.grey.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$completedCount/${book.chapterCount} ✓',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isAllCompleted ? const Color(0xFF047857) : Colors.grey[700],
                    ),
                  ),
                ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
            ],
          ),
          onTap: () {
            setState(() {
              _selectedBook = book;
            });
          },
        );
      },
    );
  }

  Widget _buildChapterGrid(Book book, Set<String> completedChapters) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 5,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.1,
      ),
      itemCount: book.chapterCount,
      itemBuilder: (context, index) {
        final chapterNum = index + 1;
        final isCompleted = completedChapters.contains('${book.id}_$chapterNum');
        final isCurrent = ref.read(currentBookProvider)?.id == book.id &&
            ref.read(currentChapterProvider) == chapterNum;

        return InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () {
            ref.read(currentBookProvider.notifier).selectBook(book);
            ref.read(currentChapterProvider.notifier).setChapter(chapterNum);
            Navigator.pop(context);
          },
          child: Container(
            decoration: BoxDecoration(
              color: isCurrent
                  ? AppColors.primaryBurgundy
                  : (isCompleted
                      ? const Color(0xFFD1FAE5)
                      : Theme.of(context).cardTheme.color),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isCurrent
                    ? AppColors.primaryBurgundy
                    : (isCompleted
                        ? const Color(0xFF10B981)
                        : Colors.grey.withValues(alpha: 0.3)),
                width: isCurrent || isCompleted ? 1.5 : 1,
              ),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Text(
                  '$chapterNum',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: isCurrent
                        ? Colors.white
                        : (isCompleted ? const Color(0xFF065F46) : null),
                  ),
                ),
                if (isCompleted && !isCurrent)
                  const Positioned(
                    top: 4,
                    right: 4,
                    child: Icon(
                      Icons.check_circle_rounded,
                      size: 14,
                      color: Color(0xFF10B981),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
