import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/bible_provider.dart';

class ReaderSettingsSheet extends ConsumerWidget {
  const ReaderSettingsSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fontSize = ref.watch(fontSizeProvider);
    final isSerif = ref.watch(isSerifProvider);
    final currentTheme = ref.watch(readingThemeProvider);

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
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
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Ajustes de Leitura',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Tema visual
            const Text(
              'TEMA DA PÁGINA',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _ThemeOption(
                  title: 'Claro',
                  bgColor: AppColors.lightBg,
                  textColor: AppColors.lightText,
                  isSelected: currentTheme == ReadingTheme.light,
                  onTap: () => ref.read(readingThemeProvider.notifier).setTheme(ReadingTheme.light),
                ),
                const SizedBox(width: 12),
                _ThemeOption(
                  title: 'Sépia',
                  bgColor: AppColors.sepiaBg,
                  textColor: AppColors.sepiaText,
                  isSelected: currentTheme == ReadingTheme.sepia,
                  onTap: () => ref.read(readingThemeProvider.notifier).setTheme(ReadingTheme.sepia),
                ),
                const SizedBox(width: 12),
                _ThemeOption(
                  title: 'Escuro',
                  bgColor: AppColors.darkBg,
                  textColor: AppColors.darkText,
                  isSelected: currentTheme == ReadingTheme.dark,
                  onTap: () => ref.read(readingThemeProvider.notifier).setTheme(ReadingTheme.dark),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Tamanho da fonte
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'TAMANHO DA FONTE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.0,
                    color: Colors.grey,
                  ),
                ),
                Text(
                  '${fontSize.round()} pt',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Row(
              children: [
                const Text('A', style: TextStyle(fontSize: 14)),
                Expanded(
                  child: Slider(
                    value: fontSize,
                    min: 14.0,
                    max: 28.0,
                    divisions: 14,
                    activeColor: AppColors.primaryBurgundy,
                    onChanged: (val) {
                      ref.read(fontSizeProvider.notifier).setSize(val);
                    },
                  ),
                ),
                const Text('A', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              ],
            ),

            const SizedBox(height: 16),

            // Estilo da tipografia
            const Text(
              'TIPOGRAFIA',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: isSerif
                            ? AppColors.primaryBurgundy
                            : (isDark ? Colors.white24 : Colors.black12),
                        width: isSerif ? 2 : 1,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {
                      if (!isSerif) ref.read(isSerifProvider.notifier).toggle();
                    },
                    child: const Text(
                      'Serifada (Clássica)',
                      style: TextStyle(fontFamily: 'serif', fontSize: 15),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: !isSerif
                            ? AppColors.primaryBurgundy
                            : (isDark ? Colors.white24 : Colors.black12),
                        width: !isSerif ? 2 : 1,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {
                      if (isSerif) ref.read(isSerifProvider.notifier).toggle();
                    },
                    child: const Text(
                      'Sem Serifa (Moderna)',
                      style: TextStyle(fontFamily: 'sans-serif', fontSize: 15),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

class _ThemeOption extends StatelessWidget {
  final String title;
  final Color bgColor;
  final Color textColor;
  final bool isSelected;
  final VoidCallback onTap;

  const _ThemeOption({
    required this.title,
    required this.bgColor,
    required this.textColor,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.goldAccent : Colors.grey.withValues(alpha: 0.3),
              width: isSelected ? 2.5 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            title,
            style: TextStyle(
              color: textColor,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}
