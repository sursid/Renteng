@echo off
echo ==================================================
echo   Mengimpor Database Kopdes (MySQL/MariaDB)
echo ==================================================
echo Pastikan XAMPP/MySQL sudah berjalan!
echo.
set /p dbuser="Masukkan Username MySQL (default: root): "
if "%dbuser%"=="" set dbuser=root

echo.
echo Sedang mengimpor data ke database 'kopdes_renteng'...
echo (Jika dimintai password, silakan masukkan password MySQL Anda)
mysql -u %dbuser% -p -e "CREATE DATABASE IF NOT EXISTS kopdes_renteng;"
mysql -u %dbuser% -p kopdes_renteng < kopdes_renteng.sql

echo.
echo Selesai! Database berhasil diimpor.
pause
