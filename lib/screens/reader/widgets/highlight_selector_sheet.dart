import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../domain/models/book.dart';
import '../../../domain/models/verse.dart';
import '../../../domain/models/user_highlight.dart';
import '../../../providers/highlights_provider.dart';
import '../../../providers/prayers_provider.dart';

class HighlightSelectorSheet extends ConsumerWidget {
  final Book book;
  final Verse verse;
  final UserHighlight? currentHighlight;

  const HighlightSelectorSheet({
    super.key,
    required this.book,
    required this.verse,
    this.currentHighlight,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorsList = AppColors.highlights.values.toList();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Cabeçalho da passagem
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${book.name} ${verse.chapter}:${verse.number}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryBurgundy,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primaryBurgundy.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'ACF',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryBurgundy,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Texto do versículo
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                verse.text,
                style: const TextStyle(
                  fontSize: 15,
                  height: 1.4,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),

            const SizedBox(height: 20),

            // 5 Cores de Marca-texto
            const Text(
              'DESTACAR EM CORES',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: colorsList.map((hl) {
                final isSelected = currentHighlight?.color == hl.key;
                return GestureDetector(
                  onTap: () async {
                    await ref.read(chapterHighlightsProvider.notifier).setHighlight(
                          verse: verse.number,
                          color: hl.key,
                        );
                    if (context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Versículo destacado em ${hl.label}!'),
                          duration: const Duration(seconds: 1),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                  child: Column(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: hl.color,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected ? Colors.black87 : Colors.white,
                            width: isSelected ? 3 : 2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: hl.color.withValues(alpha: 0.4),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: isSelected
                            ? const Icon(Icons.check, color: Colors.white, size: 24)
                            : null,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        hl.label,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),
            const Divider(),

            // Ações extras: Copiar, Remover Destaque, Criar Oração
            Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    icon: const Icon(Icons.copy_rounded, size: 18),
                    label: const Text('Copiar'),
                    onPressed: () {
                      final textToCopy =
                          '"${verse.text}" (${book.name} ${verse.chapter}:${verse.number} ACF)';
                      Clipboard.setData(ClipboardData(text: textToCopy));
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Versículo copiado para a área de transferência!'),
                          duration: Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                  ),
                ),
                if (currentHighlight != null) ...[
                  Expanded(
                    child: TextButton.icon(
                      icon: const Icon(Icons.format_color_reset_rounded, size: 18, color: Colors.red),
                      label: const Text('Remover', style: TextStyle(color: Colors.red)),
                      onPressed: () async {
                        await ref
                            .read(chapterHighlightsProvider.notifier)
                            .removeHighlight(verse.number);
                        if (context.mounted) {
                          Navigator.pop(context);
                        }
                      },
                    ),
                  ),
                ],
                Expanded(
                  child: TextButton.icon(
                    icon: const Icon(Icons.bookmark_border_rounded, size: 18),
                    label: const Text('Orar'),
                    onPressed: () {
                      Navigator.pop(context);
                      _showAddPrayerFromVerseDialog(context, ref);
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showAddPrayerFromVerseDialog(BuildContext context, WidgetRef ref) {
    final titleController = TextEditingController(
      text: 'Oração sobre ${book.name} ${verse.chapter}:${verse.number}',
    );
    final descController = TextEditingController(
      text: '"${verse.text}"\n\nSenhor, ajuda-me a viver esta verdade...',
    );

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Novo Pedido de Oração'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              decoration: const InputDecoration(
                labelText: 'Título do pedido',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Motivo / Passagem base',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primaryBurgundy),
            onPressed: () {
              if (titleController.text.trim().isNotEmpty) {
                ref.read(prayersProvider.notifier).addPrayer(
                      titleController.text,
                      descController.text,
                    );
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Pedido adicionado ao Mural de Orações!'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            child: const Text('Salvar Oração'),
          ),
        ],
      ),
    );
  }
}
