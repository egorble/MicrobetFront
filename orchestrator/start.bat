@echo off
echo 🎯 Запуск Linera Prediction Game Orchestrator
echo.

REM Перевіряємо чи встановлені залежності
if not exist "node_modules" (
    echo 📦 Встановлення залежностей...
    npm install
    echo.
)

echo 🚀 Запуск оркестратора...
echo Для зупинки натисніть Ctrl+C
echo.

npm start