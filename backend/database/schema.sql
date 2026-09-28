-- CaseFlow schema only: no accounts, credentials, or application data.
-- Initialize through scripts/setup-database.php to check existing definitions.

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'Support Agent',
  `session_version` int unsigned NOT NULL DEFAULT 1,
  `avatar_id` varchar(32) DEFAULT NULL,
  `settings_json` JSON DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` varchar(32) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('Active','Inactive','Suspended') NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `attempt_key` char(64) NOT NULL,
  `attempts` int unsigned NOT NULL DEFAULT 1,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`attempt_key`),
  KEY `idx_login_attempts_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cases` (
  `id` varchar(32) NOT NULL,
  `customer_id` varchar(32) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `priority` enum('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium',
  `status` enum('Open','In Progress','Pending','Resolved','Closed') NOT NULL DEFAULT 'Open',
  `category` varchar(100) NOT NULL DEFAULT 'General Inquiry',
  `assigned_agent` varchar(150) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cases_customer` (`customer_id`),
  KEY `idx_cases_status` (`status`),
  KEY `idx_cases_created_at` (`created_at`),
  CONSTRAINT `fk_cases_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `case_activities` (
  `id` varchar(32) NOT NULL,
  `case_id` varchar(32) NOT NULL,
  `activity_type` varchar(50) NOT NULL,
  `activity_text` text NOT NULL,
  `agent_name` varchar(150) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_case_activities_case_date` (`case_id`,`created_at`),
  CONSTRAINT `fk_case_activities_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `communications` (
  `id` varchar(32) NOT NULL,
  `case_id` varchar(32) NOT NULL,
  `customer_id` varchar(32) NOT NULL,
  `communication_type` enum('Email','Phone','Internal Note','Customer Message') NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `agent_name` varchar(150) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_communications_case_date` (`case_id`,`created_at`),
  KEY `idx_communications_customer` (`customer_id`),
  CONSTRAINT `fk_communications_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`),
  CONSTRAINT `fk_communications_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attachments` (
  `id` varchar(32) NOT NULL,
  `case_id` varchar(32) DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `file_name` varchar(200) NOT NULL,
  `mime_type` varchar(150) NOT NULL,
  `file_size` bigint unsigned NOT NULL,
  `file_content` mediumblob NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_attachments_case` (`case_id`),
  KEY `idx_attachments_user` (`user_id`),
  KEY `idx_attachments_created_at` (`created_at`),
  CONSTRAINT `fk_attachments_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`),
  CONSTRAINT `fk_attachments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

