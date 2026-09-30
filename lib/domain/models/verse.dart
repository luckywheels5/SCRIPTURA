class Verse {
  final int id;
  final String version;
  final String bookAbbr;
  final int bookId;
  final int chapter;
  final int number;
  final String text;

  const Verse({
    required this.id,
    required this.version,
    required this.bookAbbr,
    required this.bookId,
    required this.chapter,
    required this.number,
    required this.text,
  });

  factory Verse.fromMap(Map<String, dynamic> map, {int? bookId}) {
    return Verse(
      id: map['id'] as int,
      version: map['version'] as String? ?? 'acf',
      bookAbbr: map['book'] as String,
      bookId: bookId ?? (map['book_id'] as int? ?? 1),
      chapter: map['chapter'] as int,
      number: map['number'] as int,
      text: map['text'] as String,
    );
  }
}
