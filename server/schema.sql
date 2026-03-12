-- Database Schema for WhatsApp Sender Licensing System
-- Import this into your MySQL/MariaDB (e.g., via phpMyAdmin)

CREATE DATABASE IF NOT EXISTS `license_db`;
USE `license_db`;

-- Plans table
CREATE TABLE IF NOT EXISTS `plans` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL,
    `daily_limit` INT DEFAULT 500,
    `monthly_limit` INT DEFAULT 10000,
    `duration_days` INT DEFAULT 30,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default plans
INSERT INTO `plans` (`name`, `daily_limit`, `monthly_limit`, `duration_days`) VALUES 
('Trial', 50, 200, 7),
('Basic', 500, 10000, 30),
('Pro', 2000, 50000, 30),
('Unlimited', 999999, 999999, 30);

-- License Keys table
CREATE TABLE IF NOT EXISTS `licenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `license_key` VARCHAR(64) UNIQUE NOT NULL,
    `plan_id` INT,
    `hwid` VARCHAR(255) DEFAULT NULL,
    `user_email` VARCHAR(100) DEFAULT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `activated_at` DATETIME DEFAULT NULL,
    `expires_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`)
);

-- Users table (New for Login System)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `plan_id` INT,
    `custom_daily_limit` INT DEFAULT NULL,
    `hwid` VARCHAR(255) DEFAULT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `activated_at` DATETIME DEFAULT NULL,
    `expires_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`)
);

-- Usage Logs table (Updated to reference users)
CREATE TABLE IF NOT EXISTS `usage_logs_v2` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT,
    `messages_sent` INT DEFAULT 0,
    `log_date` DATE NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    UNIQUE KEY `unique_daily_usage_user` (`user_id`, `log_date`)
);

-- Admin Users table
CREATE TABLE IF NOT EXISTS `admins` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial admin (password: admin123 - CHANGE THIS LATER)
INSERT INTO `admins` (`username`, `password_hash`) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
