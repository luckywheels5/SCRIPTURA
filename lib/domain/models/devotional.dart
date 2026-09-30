class Devotional {
  final int? id;
  final String date; // YYYY-MM-DD
  final String title;
  final String bibleReference;
  final String content;
  final String? sourceAuthor;
  final DateTime createdAt;

  const Devotional({
    this.id,
    required this.date,
    required this.title,
    required this.bibleReference,
    required this.content,
    this.sourceAuthor,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'date': date,
      'title': title,
      'bible_reference': bibleReference,
      'content': content,
      'source_author': sourceAuthor,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory Devotional.fromMap(Map<String, dynamic> map) {
    return Devotional(
      id: map['id'] as int?,
      date: map['date'] as String,
      title: map['title'] as String,
      bibleReference: map['bible_reference'] as String,
      content: map['content'] as String,
      sourceAuthor: map['source_author'] as String?,
      createdAt: map['created_at'] != null
          ? DateTime.tryParse(map['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
