class UserPrayer {
  final int? id;
  final String userId;
  final String title;
  final String? description;
  final String status; // 'ativo' or 'respondido'
  final DateTime createdAt;
  final DateTime? answeredAt;

  const UserPrayer({
    this.id,
    required this.userId,
    required this.title,
    this.description,
    this.status = 'ativo',
    required this.createdAt,
    this.answeredAt,
  });

  bool get isAnswered => status == 'respondido';
  bool get isActive => status == 'ativo';

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'title': title,
      'description': description,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'answered_at': answeredAt?.toIso8601String(),
    };
  }

  factory UserPrayer.fromMap(Map<String, dynamic> map) {
    return UserPrayer(
      id: map['id'] as int?,
      userId: map['user_id'] as String,
      title: map['title'] as String,
      description: map['description'] as String?,
      status: map['status'] as String? ?? 'ativo',
      createdAt: map['created_at'] != null
          ? DateTime.tryParse(map['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
      answeredAt: map['answered_at'] != null
          ? DateTime.tryParse(map['answered_at'] as String)
          : null,
    );
  }

  UserPrayer copyWith({
    int? id,
    String? userId,
    String? title,
    String? description,
    String? status,
    DateTime? createdAt,
    DateTime? answeredAt,
  }) {
    return UserPrayer(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      answeredAt: answeredAt ?? this.answeredAt,
    );
  }
}
