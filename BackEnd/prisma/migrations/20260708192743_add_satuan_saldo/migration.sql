-- AlterTable
ALTER TABLE `tb_anggota_warga` ADD COLUMN `saldo` DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `tb_kebutuhan_sppg` ADD COLUMN `satuan` VARCHAR(20) NOT NULL DEFAULT 'kg';

-- AlterTable
ALTER TABLE `tb_produksi_harian` ADD COLUMN `satuan` VARCHAR(20) NOT NULL DEFAULT 'kg';
