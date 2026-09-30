import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:scriptura_app/main.dart';

void main() {
  testWidgets('Scriptura app initializes smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: ScripturaApp(),
      ),
    );

    expect(find.byType(ScripturaApp), findsOneWidget);
  });
}
