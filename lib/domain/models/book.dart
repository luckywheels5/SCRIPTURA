class Book {
  final int id; // 1 to 66
  final String abbreviation;
  final String name;
  final String testament; // 'at' or 'nt'
  final int chapterCount;
  final int orderIndex;

  const Book({
    required this.id,
    required this.abbreviation,
    required this.name,
    required this.testament,
    required this.chapterCount,
    required this.orderIndex,
  });

  factory Book.fromMap(Map<String, dynamic> map) {
    return Book(
      id: map['id'] as int,
      abbreviation: map['abbreviation'] as String,
      name: map['name'] as String,
      testament: map['testament'] as String,
      chapterCount: map['chapter_count'] as int,
      orderIndex: map['order_index'] as int? ?? (map['id'] as int) - 1,
    );
  }

  bool get isOldTestament => testament.toLowerCase() == 'at';
  bool get isNewTestament => testament.toLowerCase() == 'nt';
}
