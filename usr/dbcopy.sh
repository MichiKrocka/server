#!/bin/bash

if [ $# != 2 ]
then
  echo use $0 src dst
  exit -1
fi

MYSQL="mysql -ukrocka -pmiso62krocka -N -r -B "

echo "DROP DATABASE IF EXISTS $2;CREATE DATABASE $2 DEFAULT CHARACTER SET utf8;" | $MYSQL

mysqldump --events --routines --triggers -R -ukrocka -pmiso62krocka $1 | $MYSQL $2
