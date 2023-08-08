sudo apt update -y
sudo apt upgrade -y
echo "Instalando o PIP"
sudo apt install python3-pip -y
echo "Instalando dependencias"
pip3 install requests google-cloud-storage python-slugify[unidecode]
echo "matado todos os processos fipe.py"
pkill -f fipe.py 
echo "iniciado processo em BG fipe.py"
nohup python3 -u ./fipe.py > output.log &