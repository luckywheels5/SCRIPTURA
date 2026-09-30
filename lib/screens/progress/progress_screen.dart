import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../domain/models/user_highlight.dart';
import '../../providers/bible_provider.dart';
import '../../providers/highlights_provider.dart';
import '../../providers/prayers_provider.dart';
import '../../providers/progress_provider.dart';
import '../../providers/user_provider.dart';

class ProgressScreen extends ConsumerStatefulWidget {
  final VoidCallback onNavigateToBible;

  const ProgressScreen({
    super.key,
    required this.onNavigateToBible,
  });

  @override
  ConsumerState<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends ConsumerState<ProgressScreen> {
  String? _selectedColorFilter;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(userProfileProvider);
    final completedChapters = ref.watch(userProgressProvider);
    final booksAsync = ref.watch(booksListProvider);
    final allHighlightsAsync = ref.watch(allUserHighlightsProvider);
    final prayers = ref.watch(prayersProvider);

    final activePrayersCount = prayers.where((p) => p.isActive).length;
    final answeredPrayersCount = prayers.where((p) => p.isAnswered).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Progresso & Destaques'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        children: [
          // CARD DO PERFIL DO LEITOR
          _buildUserProfileCard(
            context,
            user,
            completedCount: completedChapters.length,
            highlightsCount: allHighlightsAsync.asData?.value.length ?? 0,
            activePrayers: activePrayersCount,
            answeredPrayers: answeredPrayersCount,
          ),

          const SizedBox(height: 24),

          // PROGRESSO DA LEITURA BÍBLICA (1.189 CAPÍTULOS)
          booksAsync.when(
            data: (books) => _buildBibleProgressSection(books, completedChapters),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('Erro ao carregar dados da Bíblia: $e'),
          ),

          const SizedBox(height: 28),

          // DESTAQUES DE VERSÍCULOS
          _buildHighlightsSection(context, ref, allHighlightsAsync),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildUserProfileCard(
    BuildContext context,
    dynamic user, {
    required int completedCount,
    required int highlightsCount,
    required int activePrayers,
    required int answeredPrayers,
  }) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.primaryBurgundy.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primaryBurgundy,
                  child: Text(
                    user.name.isNotEmpty ? user.name[0].toUpperCase() : 'S',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              user.name,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit, size: 18, color: Colors.grey),
                            tooltip: 'Editar Nome',
                            onPressed: () => _showEditNameDialog(context, user.name),
                          ),
                        ],
                      ),
                      InkWell(
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: user.userId));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('ID do Usuário copiado!'),
                              duration: Duration(seconds: 1),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        child: Row(
                          children: [
                            Text(
                              'ID: ${user.userId.length > 8 ? user.userId.substring(0, 8) : user.userId}...',
                              style: const TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                            const SizedBox(width: 4),
                            const Icon(Icons.copy, size: 12, color: Colors.grey),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 12),
            // Métricas Rápidas
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatColumn('Capítulos', '$completedCount', const Color(0xFF10B981)),
                _buildStatColumn('Destaques', '$highlightsCount', AppColors.goldAccent),
                _buildStatColumn('Orações Ativas', '$activePrayers', AppColors.primaryBurgundy),
                _buildStatColumn('Respondidas', '$answeredPrayers', const Color(0xFF047857)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.grey),
        ),
      ],
    );
  }

  Widget _buildBibleProgressSection(
    List<dynamic> books,
    Set<String> completedChapters,
  ) {
    const totalBibleChapters = 1189;
    const otTotal = 929;
    const ntTotal = 260;

    int totalCompleted = completedChapters.length;
    int otCompleted = 0;
    int ntCompleted = 0;

    for (final key in completedChapters) {
      final parts = key.split('_');
      if (parts.isNotEmpty) {
        final bookId = int.tryParse(parts[0]) ?? 1;
        if (bookId <= 39) {
          otCompleted++;
        } else {
          ntCompleted++;
        }
      }
    }

    final totalPercent = (totalCompleted / totalBibleChapters * 100).clamp(0.0, 100.0);
    final otPercent = (otCompleted / otTotal * 100).clamp(0.0, 100.0);
    final ntPercent = (ntCompleted / ntTotal * 100).clamp(0.0, 100.0);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.auto_stories_rounded, color: AppColors.primaryBurgundy),
                SizedBox(width: 8),
                Text(
                  'PROGRESSO DA BÍBLIA (ACF)',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Barra Geral
            _buildProgressBar(
              title: 'Bíblia Completa',
              countText: '$totalCompleted de $totalBibleChapters capítulos',
              percent: totalPercent,
              color: AppColors.primaryBurgundy,
            ),
            const SizedBox(height: 14),

            // Antigo Testamento
            _buildProgressBar(
              title: 'Antigo Testamento',
              countText: '$otCompleted de $otTotal capítulos',
              percent: otPercent,
              color: const Color(0xFFD97706),
            ),
            const SizedBox(height: 14),

            // Novo Testamento
            _buildProgressBar(
              title: 'Novo Testamento',
              countText: '$ntCompleted de $ntTotal capítulos',
              percent: ntPercent,
              color: const Color(0xFF10B981),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressBar({
    required String title,
    required String countText,
    required double percent,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            Text(
              '${percent.toStringAsFixed(1)}%',
              style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 14),
            ),
          ],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: percent / 100,
          minHeight: 8,
          borderRadius: BorderRadius.circular(4),
          backgroundColor: Colors.grey.withValues(alpha: 0.15),
          valueColor: AlwaysStoppedAnimation<Color>(color),
        ),
        const SizedBox(height: 4),
        Text(countText, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }

  Widget _buildHighlightsSection(
    BuildContext context,
    WidgetRef ref,
    AsyncValue<List<UserHighlight>> allHighlightsAsync,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.palette_rounded, color: AppColors.goldAccent),
            SizedBox(width: 8),
            Text(
              'SEUS VERSÍCULOS DESTACADOS',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: AppColors.primaryBurgundy,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Filtro por cor
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              FilterChip(
                label: const Text('Todos'),
                selected: _selectedColorFilter == null,
                onSelected: (_) {
                  setState(() {
                    _selectedColorFilter = null;
                  });
                },
              ),
              const SizedBox(width: 6),
              ...AppColors.highlights.values.map((hl) {
                final isSelected = _selectedColorFilter == hl.key;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    avatar: CircleAvatar(
                      backgroundColor: hl.color,
                      radius: 6,
                    ),
                    label: Text(hl.label),
                    selected: isSelected,
                    onSelected: (_) {
                      setState(() {
                        _selectedColorFilter = isSelected ? null : hl.key;
                      });
                    },
                  ),
                );
              }),
            ],
          ),
        ),

        const SizedBox(height: 12),

        allHighlightsAsync.when(
          data: (highlights) {
            final filtered = _selectedColorFilter == null
                ? highlights
                : highlights.where((h) => h.color == _selectedColorFilter).toList();

            if (filtered.isEmpty) {
              return const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'Nenhum versículo destacado com esta cor ainda.\nToque em qualquer versículo durante a leitura para marcá-lo!',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                ),
              );
            }

            return Column(
              children: filtered.map((h) {
                final hlData = AppColors.highlights[h.color];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: hlData?.color ?? AppColors.goldAccent,
                      radius: 8,
                    ),
                    title: Text(
                      '${h.bookName ?? "Livro"} ${h.chapter}:${h.verse}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: h.verseText != null
                        ? Text(
                            h.verseText!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontStyle: FontStyle.italic),
                          )
                        : null,
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                    onTap: () async {
                      final books = await ref.read(booksListProvider.future);
                      final targetBook = books.firstWhere(
                        (b) => b.id == h.bookId,
                        orElse: () => books.first,
                      );
                      ref.read(currentBookProvider.notifier).selectBook(targetBook);
                      ref.read(currentChapterProvider.notifier).setChapter(h.chapter);
                      widget.onNavigateToBible();
                    },
                  ),
                );
              }).toList(),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Text('Erro ao carregar destaques: $e'),
        ),
      ],
    );
  }

  void _showEditNameDialog(BuildContext context, String currentName) {
    final controller = TextEditingController(text: currentName);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Editar Nome do Leitor'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Seu Nome',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primaryBurgundy),
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                ref.read(userProfileProvider.notifier).updateUserName(controller.text.trim());
                Navigator.pop(ctx);
              }
            },
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
  }
}
