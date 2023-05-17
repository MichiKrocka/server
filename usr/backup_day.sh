#!/bin/bash
###########################################################
LOG_STR="BACKUP D"
TIMESTAMP="0"$(date +"%u")
BACKUP_ROOT="/home/storage/backup"
USER=krocka
PSWD=miso62krocka
MYSQLDUMP="mysqldump --events --routines --triggers -R -u $USER -p$PSWD -B "
MYSQL="mysql -u $USER -p$PSWD "
# emails ###################################################
BACKUP_DIR="$BACKUP_ROOT/emails/$TIMESTAMP"

logger "$LOG_STR emails"
rm -r -f $HOME/.imap-backup/info_koegler-reisedienst.de
/usr/local/bin/imap-backup backup
mkdir -p "$BACKUP_DIR"
rm -f "$BACKUP_DIR"/*
/bin/tar -czf $BACKUP_DIR/emails.tar.gz $HOME/.imap-backup/info_koegler-reisedienst.de &> /dev/null
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
############################################################
