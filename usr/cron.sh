#!/bin/bash
# get IP ##################################################
PUBL_IP=`curl -s api.ipify.org` 
#set DynDNS goip ###########################################
HOST=krocka.goip.de
GOIP_IP=`dig +short ${HOST}`

USER=sJR7wQxv5hVHpRZ
PSWD=tZdm57AkXsTxk4S

if [[ $PUBL_IP != $GOIP_IP || "$1" == "restart" ]]; then
  curl "https://www.goip.de/setip?username=${USER}&password=${PSWD}"
  echo "Update $HOST"
fi

#if [ "$1" == "restart" ]; then
#  curl "https://www.goip.de/setip?username=${USER}&password=${PSWD}"
#fi

#set DynDNS dnshome ########################################
HOST=krocka.dnshome.de
DNSHOME_IP=`dig +short ${HOST}`

USER=krocka.dnshome.de
PSWD=sl-xp330

if [[ $PUBL_IP != $GOIP_IP || "$1" == "restart" ]]; then
  curl "https://www.dnshome.de/dyndns.php?u=$USER&p=$PSWD&ip=$PUBL_IP"
#curl --get --data-urlencode "u=$USER" --data-urlencode "p=$PSWD" --data-urlencode "ip=$PUBL_IP" https://www.dnshome.de/nic/update
  echo "Update $HOST"
fi
