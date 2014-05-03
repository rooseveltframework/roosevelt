cd "`dirname "$0"`"
cd ../

hash npm 2>/dev/null || {
  echo >&2 "You must install Node.js and npm to run this program: http://nodejs.org"
  exit 1
}

hash nodemon 2>/dev/null || {
  echo "You must install nodemon run this program. Please enter your password to install nodemon:";
  sudo npm install -g nodemon
}

if [ ! -d "node_modules" ]; then
  npm install
fi

npm start