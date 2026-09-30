class UserHighlight {
  final int? id;
  final String userId;
  final int bookId;
  final int chapter;
  final int verse;
  final int startOffset;
  final int endOffset;
  final String color; // 'verde', 'amarelo', 'azul', 'laranja', 'rosa'
  final DateTime createdAt;

  // Propriedades auxiliares para visualização
  final String? bookName;
  final String? verseText;

  const UserHighlight({
    this.id,
    required this.userId,
    required this.bookId,
    required this.chapter,
    required this.verse,
    this.startOffset = 0,
    this.endOffset = 0,
    required this.color,
    required this.createdAt,
    this.bookName,
    this.verseText,
  });

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'book_id': bookId,
      'chapter': chapter,
      'verse': verse,
      'start_offset': startOffset,
      'end_offset': endOffset,
      'color': color,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory UserHighlight.fromMap(Map<String, dynamic> map) {
    return UserHighlight(
      id: map['id'] as int?,
      userId: map['user_id'] as String,
      bookId: map['book_id'] as int,
      chapter: map['chapter'] as int,
      verse: map['verse'] as int,
      startOffset: map['start_offset'] as int? ?? 0,
      endOffset: map['end_offset'] as int? ?? 0,
      color: map['color'] as String,
      createdAt: map['created_at'] != null
          ? DateTime.tryParse(map['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
      bookName: map['book_name'] as String?,
      verseText: map['verse_text'] as String?,
    );
  }
}
