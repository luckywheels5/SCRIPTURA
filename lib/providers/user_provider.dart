import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../domain/models/user_profile.dart';

const String _prefUserIdKey = 'scriptura_user_id';
const String _prefUserNameKey = 'scriptura_user_name';

final userProfileProvider = StateNotifierProvider<UserNotifier, UserProfile>((ref) {
  return UserNotifier();
});

class UserNotifier extends StateNotifier<UserProfile> {
  UserNotifier()
      : super(UserProfile(
          userId: '',
          name: 'Leitor das Escrituras',
          createdAt: DateTime.now(),
        )) {
    loadUser();
  }

  Future<void> loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    var userId = prefs.getString(_prefUserIdKey);
    var name = prefs.getString(_prefUserNameKey);

    if (userId == null || userId.isEmpty) {
      // Autenticação rápida: Gera UUID persistente para o usuário
      userId = const Uuid().v4();
      name = 'Leitor das Escrituras';
      await prefs.setString(_prefUserIdKey, userId);
      await prefs.setString(_prefUserNameKey, name);
    }

    state = UserProfile(
      userId: userId,
      name: name ?? 'Leitor das Escrituras',
      createdAt: DateTime.now(),
    );
  }

  Future<void> updateUserName(String newName) async {
    final trimmed = newName.trim();
    if (trimmed.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefUserNameKey, trimmed);
    state = UserProfile(
      userId: state.userId,
      name: trimmed,
      createdAt: state.createdAt,
    );
  }

  Future<void> createNewProfile(String newName) async {
    final prefs = await SharedPreferences.getInstance();
    final newId = const Uuid().v4();
    final name = newName.trim().isEmpty ? 'Novo Leitor' : newName.trim();
    await prefs.setString(_prefUserIdKey, newId);
    await prefs.setString(_prefUserNameKey, name);
    state = UserProfile(
      userId: newId,
      name: name,
      createdAt: DateTime.now(),
    );
  }
}
