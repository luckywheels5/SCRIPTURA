import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'core/theme/app_theme.dart';
import 'data/database/database_helper.dart';
import 'providers/bible_provider.dart';
import 'screens/home_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inicializa FFI para SQLite em plataformas Desktop (Linux, macOS, Windows)
  if (!kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.linux ||
          defaultTargetPlatform == TargetPlatform.windows ||
          defaultTargetPlatform == TargetPlatform.macOS)) {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  }

  // Inicializa o banco de dados e assegura tabelas e devocionais
  try {
    await DatabaseHelper.instance.database;
  } catch (e) {
    debugPrint('Erro ao inicializar banco de dados: $e');
  }

  runApp(
    const ProviderScope(
      child: ScripturaApp(),
    ),
  );
}

class ScripturaApp extends ConsumerWidget {
  const ScripturaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final readingTheme = ref.watch(readingThemeProvider);

    ThemeData activeTheme;
    switch (readingTheme) {
      case ReadingTheme.sepia:
        activeTheme = AppTheme.sepiaTheme;
        break;
      case ReadingTheme.dark:
        activeTheme = AppTheme.darkTheme;
        break;
      case ReadingTheme.light:
        activeTheme = AppTheme.lightTheme;
        break;
    }

    return MaterialApp(
      title: 'Scriptura - Bíblia ACF',
      debugShowCheckedModeBanner: false,
      theme: activeTheme,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('pt', 'BR'),
      ],
      home: const HomeShell(),
    );
  }
}
