#!/bin/bash
# fake sys_exec() for MySQL/MariaDB

DIR=/tmp/sys_exec

if [ ! -d "$DIR" ]
then
    mkdir "$DIR"
    chmod 0777 "$DIR"
fi

rm -f $DIR/*

inotifywait -mrq -e create --format %w%f $DIR | while read FILE
do
    bash $FILE
    sleep 2
    rm $FILE
done
