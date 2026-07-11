-- CreateTable
CREATE TABLE `tb_koperasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idDesa` VARCHAR(50) NOT NULL,
    `namaKoperasi` VARCHAR(150) NOT NULL,
    `tingkatModernisasi` VARCHAR(50) NULL,
    `saldoKas` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'aktif',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_sppg` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idKoperasi` INTEGER NOT NULL,
    `namaSppg` VARCHAR(150) NOT NULL,
    `alamat` TEXT NULL,
    `kapasitasHarian` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'aktif',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_anggota_warga` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idKoperasi` INTEGER NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `noWhatsapp` VARCHAR(20) NOT NULL,
    `kategoriUsaha` VARCHAR(100) NULL,
    `komoditas` VARCHAR(100) NULL,
    `optInConsent` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(20) NOT NULL DEFAULT 'aktif',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tb_anggota_warga_noWhatsapp_key`(`noWhatsapp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_produksi_harian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idAnggota` INTEGER NOT NULL,
    `tanggal` DATE NOT NULL,
    `jumlahProduksi` INTEGER NOT NULL,
    `jumlahTersedia` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'tersedia',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_kebutuhan_sppg` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idSppg` INTEGER NOT NULL,
    `produk` VARCHAR(100) NOT NULL,
    `jumlah` INTEGER NOT NULL,
    `hargaMaksimal` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_ai_matching` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idOrder` INTEGER NOT NULL,
    `idAnggota` INTEGER NOT NULL,
    `score` DOUBLE NOT NULL DEFAULT 0,
    `rekomendasiAi` TEXT NULL,
    `confidence` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_ai_blast_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idMatching` INTEGER NOT NULL,
    `pesan` TEXT NOT NULL,
    `statusKirim` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `respon` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_approval_pengurus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idBlast` INTEGER NOT NULL,
    `approvedBy` VARCHAR(100) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_transaksi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idOrder` INTEGER NOT NULL,
    `idSupplier` INTEGER NOT NULL,
    `nilaiTransaksi` DECIMAL(15, 2) NOT NULL,
    `serviceFee` DECIMAL(15, 2) NOT NULL,
    `nilaiSupplier` DECIMAL(15, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_ai_learning_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idTransaksi` INTEGER NOT NULL,
    `hasilRekomendasi` TEXT NULL,
    `hasilAktual` TEXT NULL,
    `feedbackAi` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tb_sppg` ADD CONSTRAINT `tb_sppg_idKoperasi_fkey` FOREIGN KEY (`idKoperasi`) REFERENCES `tb_koperasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_anggota_warga` ADD CONSTRAINT `tb_anggota_warga_idKoperasi_fkey` FOREIGN KEY (`idKoperasi`) REFERENCES `tb_koperasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_produksi_harian` ADD CONSTRAINT `tb_produksi_harian_idAnggota_fkey` FOREIGN KEY (`idAnggota`) REFERENCES `tb_anggota_warga`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_kebutuhan_sppg` ADD CONSTRAINT `tb_kebutuhan_sppg_idSppg_fkey` FOREIGN KEY (`idSppg`) REFERENCES `tb_sppg`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_ai_matching` ADD CONSTRAINT `tb_ai_matching_idOrder_fkey` FOREIGN KEY (`idOrder`) REFERENCES `tb_kebutuhan_sppg`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_ai_matching` ADD CONSTRAINT `tb_ai_matching_idAnggota_fkey` FOREIGN KEY (`idAnggota`) REFERENCES `tb_anggota_warga`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_ai_blast_log` ADD CONSTRAINT `tb_ai_blast_log_idMatching_fkey` FOREIGN KEY (`idMatching`) REFERENCES `tb_ai_matching`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_approval_pengurus` ADD CONSTRAINT `tb_approval_pengurus_idBlast_fkey` FOREIGN KEY (`idBlast`) REFERENCES `tb_ai_blast_log`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_transaksi` ADD CONSTRAINT `tb_transaksi_idOrder_fkey` FOREIGN KEY (`idOrder`) REFERENCES `tb_kebutuhan_sppg`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_transaksi` ADD CONSTRAINT `tb_transaksi_idSupplier_fkey` FOREIGN KEY (`idSupplier`) REFERENCES `tb_anggota_warga`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_ai_learning_log` ADD CONSTRAINT `tb_ai_learning_log_idTransaksi_fkey` FOREIGN KEY (`idTransaksi`) REFERENCES `tb_transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
