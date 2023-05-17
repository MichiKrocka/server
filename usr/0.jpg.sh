#!/bin/bash
for i in plan/*.pdf
do
  #echo "${i/pdf}"0.jpg
  if [ ! -f "${i/pdf}"0.jpg ]
  then
    echo "${i/pdf}"0.jpg
    /var/www/data/bermuda/preview.sh "${i}"
  fi
done
