@echo off
cd /d "%~dp0"
node src/index.js >> "%~dp0sync.log" 2>&1
