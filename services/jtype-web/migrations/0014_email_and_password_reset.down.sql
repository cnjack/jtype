DROP TABLE IF EXISTS `email_verification_tokens`;
DROP TABLE IF EXISTS `password_reset_tokens`;
ALTER TABLE `users` DROP INDEX `users_email_unique`;
ALTER TABLE `users` DROP COLUMN `email_verified_at`;
