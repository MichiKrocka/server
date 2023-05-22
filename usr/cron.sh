#!/bin/bash

#set DynDNS goip

HOST=krocka.goip.de

PUBL_IP=`curl -s api.ipify.org` 
GOIP_IP=`dig +short ${HOST}`

USER=sJR7wQxv5hVHpRZ
PSWD=tZdm57AkXsTxk4S

if [ $PUBL_IP != $GOIP_IP ]; then
  curl "https://www.goip.de/setip?username=${USER}&password=${PSWD}"
fi

if [ "$1" == "restart" ]; then
  curl "https://www.goip.de/setip?username=${USER}&password=${PSWD}"
fi

