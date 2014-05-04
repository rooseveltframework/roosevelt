@echo off

cd ../

node --version >nul 2>&1 || (
  echo You must install Node.js and npm to run this program: http://nodejs.org
  pause >nul
  goto :eof
)

where nodemon >nul 2>&1 || (
  npm install -g nodemon
  if not exist node_modules npm install
  npm start
)

if not exist node_modules npm install
npm start