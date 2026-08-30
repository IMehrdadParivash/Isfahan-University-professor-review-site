<?php
declare(strict_types=1);

final class ReviewService
{
    public const CRITERIA = [
        'strictness', 'teaching_quality', 'grading_fairness', 'exam_difficulty',
        'behavior', 'attendance', 'workload', 'exam_alignment', 'overall',
    ];

    public static function create(array $input): array
    {
        if (trim((string) ($input['website'] ?? '')) !== '') {
            return ['accepted' => true, 'status' => 'pending'];
        }
        Security::rateLimit('review_hour', 3, 3600);
        Security::rateLimit('review_day', 8, 86400);

        $professorId = filter_var($input['professor_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $body = Security::normalizeText((string) ($input['body'] ?? ''));
        if (!$professorId || mb_strlen($body) < 20 || mb_strlen($body) > 4000) {
            Http::json(['error' => 'invalid_review', 'message' => 'متن نظر باید بین ۲۰ تا ۴۰۰۰ نویسه باشد.'], 422);
        }
        $pdo = Database::connection();
        $exists = $pdo->prepare('SELECT id FROM professors WHERE id = ? AND is_active = 1');
        $exists->execute([$professorId]);
        if (!$exists->fetchColumn()) Http::json(['error' => 'professor_not_found'], 404);

        $mode = (string) ($input['display_mode'] ?? 'anonymous');
        if (!in_array($mode, ['anonymous', 'alias', 'real_name', 'account'], true)) $mode = 'anonymous';
        Security::session();
        $userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
        if ($mode === 'account' && (!$userId || !Config::get('accounts_enabled', false))) {
            Http::json(['error' => 'account_required'], 401);
        }
        $displayName = null;
        if ($mode === 'alias' || $mode === 'real_name') {
            $displayName = Security::normalizeText((string) ($input['display_name'] ?? ''));
            if (mb_strlen($displayName) < 2 || mb_strlen($displayName) > 60) {
                Http::json(['error' => 'invalid_display_name'], 422);
            }
        }

        $courseName = Security::normalizeText((string) ($input['course_name'] ?? ''));
        $termLabel = Security::normalizeText((string) ($input['term_label'] ?? ''));
        $courseType = (string) ($input['course_type'] ?? '');
        if (!in_array($courseType, ['', 'general', 'basic', 'core', 'specialized', 'elective', 'practical'], true)) $courseType = '';
        if (mb_strlen($courseName) > 120 || mb_strlen($termLabel) > 40) Http::json(['error' => 'invalid_metadata'], 422);

        $ratings = [];
        foreach (self::CRITERIA as $criterion) {
            if (!array_key_exists($criterion, $input['ratings'] ?? [])) continue;
            $value = filter_var($input['ratings'][$criterion], FILTER_VALIDATE_INT);
            if ($value === false || $value < 1 || $value > 5) Http::json(['error' => 'invalid_rating'], 422);
            $ratings[$criterion] = $value;
        }
        if (!isset($ratings['overall'])) Http::json(['error' => 'overall_rating_required'], 422);
        $recommended = filter_var($input['recommended'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($recommended === null) Http::json(['error' => 'recommendation_required'], 422);

        $identity = Security::identityHash('review:v1');
        $duplicate = hash('sha256', $professorId . '|' . mb_strtolower(preg_replace('/\s+/u', '', $body) ?? $body));
        $duplicateQuery = $pdo->prepare("SELECT id FROM reviews WHERE professor_id = ? AND (duplicate_hash = ? OR (technical_hash = ? AND created_at >= ?)) LIMIT 1");
        $duplicateQuery->execute([$professorId, $duplicate, $identity, gmdate('Y-m-d H:i:s', time() - 604800)]);
        if ($duplicateQuery->fetchColumn()) Http::json(['error' => 'duplicate_review'], 409);

        $risk = Security::moderationRisk($body);
        $status = ($risk || !Config::get('review_auto_publish', true)) ? 'pending' : 'published';
        $now = gmdate('Y-m-d H:i:s');
        $pdo->beginTransaction();
        try {
            $insert = $pdo->prepare('INSERT INTO reviews (professor_id, user_id, display_mode, display_name, body, course_name, term_label, course_type, recommended, status, moderation_flags, technical_hash, duplicate_hash, created_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $insert->execute([
                $professorId, $userId, $mode, $displayName, $body,
                $courseName ?: null, $termLabel ?: null, $courseType ?: null,
                (int) $recommended, $status, $risk ? json_encode($risk) : null,
                $identity, $duplicate, $now, $status === 'published' ? $now : null,
            ]);
            $reviewId = (int) $pdo->lastInsertId();
            $ratingInsert = $pdo->prepare('INSERT INTO review_ratings (review_id, criterion, score) VALUES (?, ?, ?)');
            foreach ($ratings as $criterion => $score) $ratingInsert->execute([$reviewId, $criterion, $score]);
            $pdo->commit();
            if ($status === 'published') self::rebuildProfessorStats((int) $professorId);
            return ['accepted' => true, 'id' => $reviewId, 'status' => $status];
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }

    public static function listForProfessor(int $professorId, array $query): array
    {
        $pdo = Database::connection();
        $page = max(1, min(10000, (int) ($query['page'] ?? 1)));
        $limit = 10;
        $offset = ($page - 1) * $limit;
        $allowedSort = ['newest' => 'r.created_at DESC', 'helpful' => 'helpful_score DESC, r.created_at DESC', 'highest' => 'overall_score DESC, r.created_at DESC', 'lowest' => 'overall_score ASC, r.created_at DESC'];
        $order = $allowedSort[(string) ($query['sort'] ?? 'newest')] ?? $allowedSort['newest'];
        $where = ['r.professor_id = ?', "r.status = 'published'"];
        $params = [$professorId];
        $course = Security::normalizeText((string) ($query['course'] ?? ''));
        if ($course !== '') { $where[] = 'r.course_name = ?'; $params[] = $course; }
        $term = Security::normalizeText((string) ($query['term'] ?? ''));
        if ($term !== '') { $where[] = 'r.term_label = ?'; $params[] = $term; }
        if (isset($query['recommended']) && in_array((string) $query['recommended'], ['0', '1'], true)) {
            $where[] = 'r.recommended = ?'; $params[] = (int) $query['recommended'];
        }
        $rating = (int) ($query['rating'] ?? 0);
        if ($rating >= 1 && $rating <= 5) { $where[] = 'overall.score = ?'; $params[] = $rating; }
        $sql = 'SELECT r.id, r.display_mode, r.display_name, r.body, r.course_name, r.term_label, r.course_type, r.recommended, r.created_at, overall.score AS overall_score, COALESCE(SUM(v.value), 0) AS helpful_score FROM reviews r JOIN review_ratings overall ON overall.review_id = r.id AND overall.criterion = \'overall\' LEFT JOIN votes v ON v.review_id = r.id WHERE ' . implode(' AND ', $where) . ' GROUP BY r.id, r.display_mode, r.display_name, r.body, r.course_name, r.term_label, r.course_type, r.recommended, r.created_at, overall.score ORDER BY ' . $order . ' LIMIT ? OFFSET ?';
        $statement = $pdo->prepare($sql);
        foreach ([...$params, $limit, $offset] as $index => $value) $statement->bindValue($index + 1, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        $statement->execute();
        $reviews = $statement->fetchAll();
        $ids = array_map(static fn(array $row): int => (int) $row['id'], $reviews);
        $ratings = [];
        if ($ids) {
            $marks = implode(',', array_fill(0, count($ids), '?'));
            $ratingQuery = $pdo->prepare("SELECT review_id, criterion, score FROM review_ratings WHERE review_id IN ({$marks})");
            $ratingQuery->execute($ids);
            foreach ($ratingQuery->fetchAll() as $row) $ratings[(int) $row['review_id']][(string) $row['criterion']] = (int) $row['score'];
        }
        foreach ($reviews as &$review) {
            $review['id'] = (int) $review['id'];
            $review['overall_score'] = (int) $review['overall_score'];
            $review['recommended'] = (bool) $review['recommended'];
            $review['helpful_score'] = (int) $review['helpful_score'];
            $review['ratings'] = $ratings[$review['id']] ?? [];
            $review['author_label'] = match ($review['display_mode']) {
                'alias', 'real_name' => $review['display_name'],
                'account' => 'کاربر تأییدشده',
                default => 'دانشجوی ناشناس',
            };
            unset($review['display_name']);
        }
        unset($review);
        $stats = $pdo->prepare('SELECT * FROM professor_stats WHERE professor_id = ?');
        $stats->execute([$professorId]);
        $optionQuery = $pdo->prepare("SELECT course_name, term_label FROM reviews WHERE professor_id = ? AND status = 'published' GROUP BY course_name, term_label ORDER BY MAX(created_at) DESC LIMIT 200");
        $optionQuery->execute([$professorId]);
        $courses = $terms = [];
        foreach ($optionQuery->fetchAll() as $option) {
            if ($option['course_name']) $courses[] = $option['course_name'];
            if ($option['term_label']) $terms[] = $option['term_label'];
        }
        return [
            'reviews' => $reviews,
            'stats' => $stats->fetch() ?: null,
            'filters' => ['courses' => array_values(array_unique($courses)), 'terms' => array_values(array_unique($terms))],
            'page' => $page,
            'has_more' => count($reviews) === $limit,
        ];
    }

    public static function vote(int $reviewId, int $value): array
    {
        Security::rateLimit('vote_hour', 30, 3600);
        if (!in_array($value, [-1, 1], true)) Http::json(['error' => 'invalid_vote'], 422);
        $pdo = Database::connection();
        $published = $pdo->prepare("SELECT id FROM reviews WHERE id = ? AND status = 'published'");
        $published->execute([$reviewId]);
        if (!$published->fetchColumn()) Http::json(['error' => 'review_not_found'], 404);
        $identity = Security::identityHash('vote:v1');
        $existing = $pdo->prepare('SELECT value FROM votes WHERE review_id = ? AND voter_hash = ?');
        $existing->execute([$reviewId, $identity]);
        if ($existing->fetchColumn() === false) {
            $insert = $pdo->prepare('INSERT INTO votes (review_id, voter_hash, value, created_at) VALUES (?, ?, ?, ?)');
            $insert->execute([$reviewId, $identity, $value, gmdate('Y-m-d H:i:s')]);
        } else {
            $update = $pdo->prepare('UPDATE votes SET value = ?, updated_at = ? WHERE review_id = ? AND voter_hash = ?');
            $update->execute([$value, gmdate('Y-m-d H:i:s'), $reviewId, $identity]);
        }
        $score = $pdo->prepare('SELECT COALESCE(SUM(value), 0) FROM votes WHERE review_id = ?');
        $score->execute([$reviewId]);
        return ['score' => (int) $score->fetchColumn()];
    }

    public static function report(int $reviewId, array $input): array
    {
        Security::rateLimit('report_hour', 10, 3600);
        $reason = (string) ($input['reason'] ?? 'other');
        if (!in_array($reason, ['privacy', 'threat', 'impersonation', 'spam', 'illegal', 'other'], true)) $reason = 'other';
        $details = Security::normalizeText((string) ($input['details'] ?? ''));
        if (mb_strlen($details) > 500) Http::json(['error' => 'details_too_long'], 422);
        $pdo = Database::connection();
        $insert = $pdo->prepare('INSERT INTO reports (review_id, reporter_hash, reason, details, status, created_at) VALUES (?, ?, ?, ?, \'open\', ?)');
        try {
            $insert->execute([$reviewId, Security::identityHash('report:v1'), $reason, $details ?: null, gmdate('Y-m-d H:i:s')]);
        } catch (PDOException) {
            return ['accepted' => true];
        }
        return ['accepted' => true];
    }

    public static function rebuildProfessorStats(int $professorId): void
    {
        $pdo = Database::connection();
        $query = $pdo->prepare("SELECT rr.criterion, AVG(rr.score) AS average_score, COUNT(*) AS sample_size FROM review_ratings rr JOIN reviews r ON r.id = rr.review_id WHERE r.professor_id = ? AND r.status = 'published' GROUP BY rr.criterion");
        $query->execute([$professorId]);
        $averages = [];
        foreach ($query->fetchAll() as $row) $averages[$row['criterion']] = ['average' => round((float) $row['average_score'], 2), 'count' => (int) $row['sample_size']];
        $summary = $pdo->prepare("SELECT COUNT(*) AS review_count, AVG(recommended) * 100 AS recommend_percent FROM reviews WHERE professor_id = ? AND status = 'published'");
        $summary->execute([$professorId]);
        $base = $summary->fetch();
        $distribution = $pdo->prepare("SELECT rr.score, COUNT(*) AS count_value FROM review_ratings rr JOIN reviews r ON r.id = rr.review_id WHERE r.professor_id = ? AND r.status = 'published' AND rr.criterion = 'overall' GROUP BY rr.score");
        $distribution->execute([$professorId]);
        $dist = array_fill(1, 5, 0);
        foreach ($distribution->fetchAll() as $row) $dist[(int) $row['score']] = (int) $row['count_value'];
        $payload = json_encode(['criteria' => $averages, 'distribution' => $dist], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $existing = $pdo->prepare('SELECT professor_id FROM professor_stats WHERE professor_id = ?');
        $existing->execute([$professorId]);
        $values = [(int) $base['review_count'], isset($averages['overall']) ? $averages['overall']['average'] : null, $base['recommend_percent'] !== null ? round((float) $base['recommend_percent'], 1) : null, $payload, gmdate('Y-m-d H:i:s'), $professorId];
        if ($existing->fetchColumn()) {
            $update = $pdo->prepare('UPDATE professor_stats SET review_count = ?, avg_overall = ?, recommend_percent = ?, stats_json = ?, updated_at = ? WHERE professor_id = ?');
            $update->execute($values);
        } else {
            $insert = $pdo->prepare('INSERT INTO professor_stats (review_count, avg_overall, recommend_percent, stats_json, updated_at, professor_id) VALUES (?, ?, ?, ?, ?, ?)');
            $insert->execute($values);
        }
    }
}
