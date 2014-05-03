@echo off

cd "`dirname "$0"`"
cd ../

where npm
if %ERRORLEVEL% neq 0 (
  echo "You must install Node.js and npm to run this program: http://nodejs.org"
  goto :eof
)

where nodemon
if %ERRORLEVEL% neq 0 (
  npm install -g nodemon
  goto :eof
)

IF exist myDirName ( npm install )

npm start