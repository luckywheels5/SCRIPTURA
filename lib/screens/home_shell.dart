import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/app_colors.dart';
import '../providers/bible_provider.dart';
import 'reader/reader_screen.dart';
import 'devotionals/devotionals_screen.dart';
import 'prayers/prayers_screen.dart';
import 'progress/progress_screen.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    // Inicializa o primeiro livro e capítulo da sessão
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final books = await ref.read(booksListProvider.future);
      if (mounted && books.isNotEmpty) {
        ref.read(currentBookProvider.notifier).init(books);
        ref.read(currentChapterProvider.notifier).init();
      }
    });
  }

  void _navigateToBible() {
    setState(() {
      _currentIndex = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      const ReaderScreen(),
      DevotionalsScreen(onNavigateToBible: _navigateToBible),
      const PrayersScreen(),
      ProgressScreen(onNavigateToBible: _navigateToBible),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primarySlate,
        unselectedItemColor: AppColors.lightTextSecondary,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontSize: 12),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.menu_book_outlined),
            activeIcon: Icon(Icons.menu_book_rounded),
            label: 'Bíblia (ACF)',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.auto_stories_outlined),
            activeIcon: Icon(Icons.auto_stories_rounded),
            label: 'Devocionais',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bookmark_border_rounded),
            activeIcon: Icon(Icons.bookmark_rounded),
            label: 'Orações',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.insights_outlined),
            activeIcon: Icon(Icons.insights_rounded),
            label: 'Progresso',
          ),
        ],
      ),
    );
  }
}
