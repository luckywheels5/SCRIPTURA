import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Cores institucionais / Primárias (Estética Solene e Reformada)
  static const Color primaryBurgundy = Color(0xFF6B1D2F);
  static const Color primaryDarkBurgundy = Color(0xFF4A101E);
  static const Color goldAccent = Color(0xFFC59B27);
  static const Color warmGold = Color(0xFFE5C158);

  // Paleta de Temas
  static const Color lightBg = Color(0xFFFBF9F6);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightText = Color(0xFF1C1917);
  static const Color lightTextSecondary = Color(0xFF78716C);

  static const Color sepiaBg = Color(0xFFF4ECD8);
  static const Color sepiaSurface = Color(0xFFEADFCA);
  static const Color sepiaText = Color(0xFF382C1E);
  static const Color sepiaTextSecondary = Color(0xFF796853);

  static const Color darkBg = Color(0xFF121214);
  static const Color darkSurface = Color(0xFF1C1C20);
  static const Color darkText = Color(0xFFE7E5E4);
  static const Color darkTextSecondary = Color(0xFFA8A29E);

  // 5 Cores Oficiais de Destaque da Especificação:
  // ('verde', 'amarelo', 'azul', 'laranja', 'rosa')
  static const Map<String, HighlightColorData> highlights = {
    'verde': HighlightColorData(
      key: 'verde',
      label: 'Verde',
      color: Color(0xFF10B981),
      bgLight: Color(0xFFD1FAE5),
      bgDark: Color(0xFF064E3B),
      bgSepia: Color(0xFFC8EED9),
    ),
    'amarelo': HighlightColorData(
      key: 'amarelo',
      label: 'Amarelo',
      color: Color(0xFFF59E0B),
      bgLight: Color(0xFFFEF3C7),
      bgDark: Color(0xFF78350F),
      bgSepia: Color(0xFFFBE8A6),
    ),
    'azul': HighlightColorData(
      key: 'azul',
      label: 'Azul',
      color: Color(0xFF3B82F6),
      bgLight: Color(0xFFDBEAFE),
      bgDark: Color(0xFF1E3A8A),
      bgSepia: Color(0xFFD0E1FD),
    ),
    'laranja': HighlightColorData(
      key: 'laranja',
      label: 'Laranja',
      color: Color(0xFFF97316),
      bgLight: Color(0xFFFFEDD5),
      bgDark: Color(0xFF7C2D12),
      bgSepia: Color(0xFFFCDDC1),
    ),
    'rosa': HighlightColorData(
      key: 'rosa',
      label: 'Rosa',
      color: Color(0xFFEC4899),
      bgLight: Color(0xFFFCE7F3),
      bgDark: Color(0xFF831843),
      bgSepia: Color(0xFFF8D2E7),
    ),
  };
}

class HighlightColorData {
  final String key;
  final String label;
  final Color color;
  final Color bgLight;
  final Color bgDark;
  final Color bgSepia;

  const HighlightColorData({
    required this.key,
    required this.label,
    required this.color,
    required this.bgLight,
    required this.bgDark,
    required this.bgSepia,
  });

  Color getBackgroundColor(Brightness brightness, {bool isSepia = false}) {
    if (isSepia) return bgSepia;
    return brightness == Brightness.dark ? bgDark.withValues(alpha: 0.5) : bgLight;
  }
}
