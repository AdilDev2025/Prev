-- AlterTable
ALTER TABLE `Invite` ADD COLUMN `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user';
