#!/bin/bash
echo "=================================================="
echo "  Mengimpor Database Kopdes (MySQL/MariaDB)"
echo "=================================================="
echo "Pastikan MySQL service sudah berjalan!"
echo ""
read -p "Masukkan Username MySQL [default: root]: " dbuser
dbuser=${dbuser:-root}

echo ""
echo "Sedang mengimpor data ke database 'kopdes_renteng'..."
mysql -u "$dbuser" -p -e "CREATE DATABASE IF NOT EXISTS kopdes_renteng;"
mysql -u "$dbuser" -p kopdes_renteng < kopdes_renteng.sql

echo ""
echo "Selesai! Database berhasil diimpor."
