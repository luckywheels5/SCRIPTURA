class UserProgress {
  final int? id;
  final String userId;
  final int bookId;
  final int chapter;
  final DateTime completedAt;

  const UserProgress({
    this.id,
    required this.userId,
    required this.bookId,
    required this.chapter,
    required this.completedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'book_id': bookId,
      'chapter': chapter,
      'completed_at': completedAt.toIso8601String(),
    };
  }

  factory UserProgress.fromMap(Map<String, dynamic> map) {
    return UserProgress(
      id: map['id'] as int?,
      userId: map['user_id'] as String,
      bookId: map['book_id'] as int,
      chapter: map['chapter'] as int,
      completedAt: map['completed_at'] != null
          ? DateTime.tryParse(map['completed_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
