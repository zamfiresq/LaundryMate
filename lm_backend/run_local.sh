# script de pornire automata pentru a rula un server local

#!/bin/bash

# obtine IP-ul local al laptopului
IP=$(ipconfig getifaddr en0)

# portul pt rularea django
PORT=8000

# pornire server
echo "Running Django server at http://$IP:$PORT/"
python manage.py runserver "$IP:$PORT"