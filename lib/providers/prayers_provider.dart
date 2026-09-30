import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/database/database_helper.dart';
import '../domain/models/user_prayer.dart';
import 'user_provider.dart';

final prayersProvider =
    StateNotifierProvider<PrayersNotifier, List<UserPrayer>>((ref) {
  final user = ref.watch(userProfileProvider);
  return PrayersNotifier(user.userId);
});

class PrayersNotifier extends StateNotifier<List<UserPrayer>> {
  final String userId;

  PrayersNotifier(this.userId) : super([]) {
    if (userId.isNotEmpty) {
      loadPrayers();
    }
  }

  Future<void> loadPrayers() async {
    if (userId.isEmpty) return;
    final list = await DatabaseHelper.instance.getPrayers(userId);
    state = list;
  }

  Future<void> addPrayer(String title, String? description) async {
    final prayer = UserPrayer(
      userId: userId,
      title: title.trim(),
      description: description?.trim().isEmpty == true ? null : description?.trim(),
      status: 'ativo',
      createdAt: DateTime.now(),
    );
    final id = await DatabaseHelper.instance.insertPrayer(prayer);
    state = [prayer.copyWith(id: id), ...state];
  }

  Future<void> markAnswered(int id) async {
    await DatabaseHelper.instance.markPrayerAnswered(id);
    state = state.map((p) {
      if (p.id == id) {
        return p.copyWith(
          status: 'respondido',
          answeredAt: DateTime.now(),
        );
      }
      return p;
    }).toList();
  }

  Future<void> reopenPrayer(int id) async {
    await DatabaseHelper.instance.reopenPrayer(id);
    state = state.map((p) {
      if (p.id == id) {
        return UserPrayer(
          id: p.id,
          userId: p.userId,
          title: p.title,
          description: p.description,
          status: 'ativo',
          createdAt: p.createdAt,
          answeredAt: null,
        );
      }
      return p;
    }).toList();
  }

  Future<void> deletePrayer(int id) async {
    await DatabaseHelper.instance.deletePrayer(id);
    state = state.where((p) => p.id != id).toList();
  }
}
