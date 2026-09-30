import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/database/database_helper.dart';
import '../domain/models/devotional.dart';

final devotionalsListProvider = FutureProvider<List<Devotional>>((ref) async {
  return await DatabaseHelper.instance.getDevotionals();
});

final todayDevotionalProvider = FutureProvider<Devotional?>((ref) async {
  final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
  return await DatabaseHelper.instance.getDevotionalByDate(todayStr);
});
