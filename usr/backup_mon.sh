#!/bin/bash
################################################
LOG_STR="BACKUP M"
TIMESTAMP=$(date +"%Y_%m")
BACKUP_ROOT="/home/storage/backup"
USER=krocka
PSWD=miso62krocka
MYSQLDUMP="mysqldump --events --routines --triggers -R -u $USER -p$PSWD -B "
MYSQL="mysql -u $USER -p$PSWD "
# emails ###################################################
BACKUP_DIR="$BACKUP_ROOT/emails/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
logger "$LOG_STR emails"
rm -r /home/krocka/.imap-backup/info_koegler-reisedienst.de
imap-backup backup
rm -f "$BACKUP_DIR"/*
/bin/tar -czf $BACKUP_DIR/emails.tar.gz /home/krocka/.imap-backup/info_koegler-reisedienst.de &> /dev/null
# database  ################################################
BACKUP_DIR="$BACKUP_ROOT/database/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
rm -f "$BACKUP_DIR"/*
db=database

logger "$LOG_STR $db"
$MYSQLDUMP $db | gzip > "$BACKUP_DIR/$db.sql.gz"
/bin/tar -czf $BACKUP_DIR/$db.tar.gz /var/www/koegler-reisedienst.de/data/* &> /dev/null
# bermuda ##################################################
BACKUP_DIR="$BACKUP_ROOT/bermuda/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
rm -f "$BACKUP_DIR"/*
databases=`$MYSQL -e "SHOW DATABASES LIKE 'bermuda%';" | grep -Ev "(Database|information_schema|performance_schema)"`

for db in $databases; do
  $MYSQLDUMP $db | gzip > "$BACKUP_DIR/$db.sql.gz"
  if [ -d "/var/www/bermuda.goip.de/data/$db" ]; then
    logger "$LOG_STR $db"
    /bin/tar -czf $BACKUP_DIR/$db.tar.gz /var/www/bermuda.goip.de/data/$db/* &> /dev/null
  fi
done
# yxz ######################################################
BACKUP_DIR="$BACKUP_ROOT/xyz/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
logger "$LOG_STR xyz"
tar -czf $BACKUP_DIR/xyz.tar.gz /home/x /home/y /home/z &> /dev/null
############################################################
