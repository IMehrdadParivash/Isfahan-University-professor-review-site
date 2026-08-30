SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS faculties (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  UNIQUE KEY uq_faculty_name (name),
  UNIQUE KEY uq_faculty_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  UNIQUE KEY uq_department_faculty_name (faculty_id, name),
  KEY idx_department_name (name),
  CONSTRAINT fk_department_faculty FOREIGN KEY (faculty_id) REFERENCES faculties(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS professors (
  id INT UNSIGNED PRIMARY KEY,
  department_id INT UNSIGNED NULL,
  name_fa VARCHAR(180) NOT NULL,
  academic_rank VARCHAR(100) NULL,
  official_profile_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_professor_name (name_fa),
  KEY idx_professor_department (department_id, is_active),
  CONSTRAINT fk_professor_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  normalized_name VARCHAR(180) NOT NULL,
  UNIQUE KEY uq_course_normalized (normalized_name),
  KEY idx_course_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS professor_courses (
  professor_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (professor_id, course_id),
  CONSTRAINT fk_pc_professor FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  last_login_at DATETIME NULL,
  UNIQUE KEY uq_user_username (username),
  KEY idx_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  professor_id INT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  display_mode VARCHAR(20) NOT NULL,
  display_name VARCHAR(80) NULL,
  body TEXT NOT NULL,
  course_name VARCHAR(120) NULL,
  term_label VARCHAR(40) NULL,
  course_type VARCHAR(20) NULL,
  recommended TINYINT(1) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  moderation_flags TEXT NULL,
  technical_hash CHAR(64) NULL,
  duplicate_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  published_at DATETIME NULL,
  updated_at DATETIME NULL,
  KEY idx_reviews_professor_public (professor_id, status, created_at),
  KEY idx_reviews_professor_course (professor_id, course_name, status),
  KEY idx_reviews_duplicate (professor_id, duplicate_hash),
  KEY idx_reviews_identity_time (technical_hash, created_at),
  KEY idx_reviews_user (user_id),
  CONSTRAINT fk_review_professor FOREIGN KEY (professor_id) REFERENCES professors(id),
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_ratings (
  review_id BIGINT UNSIGNED NOT NULL,
  criterion VARCHAR(32) NOT NULL,
  score TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (review_id, criterion),
  KEY idx_ratings_criterion_score (criterion, score),
  CONSTRAINT fk_rating_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  CONSTRAINT chk_rating_score CHECK (score BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS votes (
  review_id BIGINT UNSIGNED NOT NULL,
  voter_hash CHAR(64) NOT NULL,
  value TINYINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY (review_id, voter_hash),
  KEY idx_votes_review_value (review_id, value),
  CONSTRAINT fk_vote_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  CONSTRAINT chk_vote_value CHECK (value IN (-1, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  review_id BIGINT UNSIGNED NOT NULL,
  reporter_hash CHAR(64) NOT NULL,
  reason VARCHAR(30) NOT NULL,
  details VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL,
  resolved_at DATETIME NULL,
  UNIQUE KEY uq_report_identity (review_id, reporter_hash),
  KEY idx_reports_status_time (status, created_at),
  CONSTRAINT fk_report_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  review_id BIGINT UNSIGNED NULL,
  action VARCHAR(30) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  previous_status VARCHAR(20) NULL,
  new_status VARCHAR(20) NULL,
  admin_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_moderation_review_time (review_id, created_at),
  CONSTRAINT fk_moderation_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  action VARCHAR(40) NOT NULL,
  identity_hash CHAR(64) NOT NULL,
  window_start BIGINT UNSIGNED NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 1,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (action, identity_hash, window_start),
  KEY idx_rate_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=ascii;

CREATE TABLE IF NOT EXISTS professor_stats (
  professor_id INT UNSIGNED PRIMARY KEY,
  review_count INT UNSIGNED NOT NULL DEFAULT 0,
  avg_overall DECIMAL(3,2) NULL,
  recommend_percent DECIMAL(5,1) NULL,
  stats_json LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_stats_professor FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS professor_change_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  professor_id INT UNSIGNED NULL,
  requester_hash CHAR(64) NOT NULL,
  request_type VARCHAR(30) NOT NULL,
  details TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL,
  KEY idx_change_requests_status (status, created_at),
  CONSTRAINT fk_change_request_professor FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
