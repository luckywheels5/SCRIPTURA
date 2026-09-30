import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Cores institucionais sóbrias e unissex (Estética Clássica, Editorial e Neutra)
  static const Color primarySlate = Color(0xFF1E293B); // Slate 800
  static const Color primaryDark = Color(0xFF0F172A);  // Slate 900
  static const Color accentNavy = Color(0xFF2563EB);   // Azul clássico
  static const Color bronzeAccent = Color(0xFF9A6A2F); // Bronze clássico sóbrio

  // Aliases compatíveis com estética neutra e sóbria
  static const Color primaryBurgundy = primarySlate;
  static const Color primaryDarkBurgundy = primaryDark;
  static const Color goldAccent = bronzeAccent;
  static const Color warmGold = Color(0xFFE2E8F0);

  // Paleta de Temas
  // Tema Claro (Limpo, neutro, papel acetinado)
  static const Color lightBg = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightText = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF64748B);
  static const Color lightBorder = Color(0xFFE2E8F0);

  // Tema Sépia (Papiro / Pergaminho tradicional)
  static const Color sepiaBg = Color(0xFFF3ECE0);
  static const Color sepiaSurface = Color(0xFFE8E0D2);
  static const Color sepiaText = Color(0xFF2C241B);
  static const Color sepiaTextSecondary = Color(0xFF706456);
  static const Color sepiaBorder = Color(0xFFD6CABA);

  // Tema Escuro (Charcoal / Grafite profundo)
  static const Color darkBg = Color(0xFF090D16);
  static const Color darkSurface = Color(0xFF151D2C);
  static const Color darkText = Color(0xFFF1F5F9);
  static const Color darkTextSecondary = Color(0xFF94A3B8);
  static const Color darkBorder = Color(0xFF1E293B);

  // 5 Cores Oficiais de Destaque da Especificação:
  // ('verde', 'amarelo', 'azul', 'laranja', 'rosa')
  // Com tons equilibrados e suaves de marcadores de texto
  static const Map<String, HighlightColorData> highlights = {
    'verde': HighlightColorData(
      key: 'verde',
      label: 'Verde',
      color: Color(0xFF059669),
      bgLight: Color(0xFFD1FAE5),
      bgDark: Color(0xFF064E3B),
      bgSepia: Color(0xFFCCEBD7),
    ),
    'amarelo': HighlightColorData(
      key: 'amarelo',
      label: 'Amarelo',
      color: Color(0xFFD97706),
      bgLight: Color(0xFFFEF3C7),
      bgDark: Color(0xFF78350F),
      bgSepia: Color(0xFFF8E7AD),
    ),
    'azul': HighlightColorData(
      key: 'azul',
      label: 'Azul',
      color: Color(0xFF2563EB),
      bgLight: Color(0xFFDBEAFE),
      bgDark: Color(0xFF1E3A8A),
      bgSepia: Color(0xFFD3E2F8),
    ),
    'laranja': HighlightColorData(
      key: 'laranja',
      label: 'Laranja',
      color: Color(0xFFEA580C),
      bgLight: Color(0xFFFFEDD5),
      bgDark: Color(0xFF7C2D12),
      bgSepia: Color(0xFFF9DBC3),
    ),
    'rosa': HighlightColorData(
      key: 'rosa',
      label: 'Rosa',
      color: Color(0xFFDB2777),
      bgLight: Color(0xFFFCE7F3),
      bgDark: Color(0xFF831843),
      bgSepia: Color(0xFFF4D4E3),
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
