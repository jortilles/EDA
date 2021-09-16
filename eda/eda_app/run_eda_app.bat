echo on
echo ""
call npm install
call ng build --prod
echo ""
cd dist
cd app-eda


call  http-server -P http://localhost:8080/   . 
