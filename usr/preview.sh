#!/bin/bash
#--------------------------------------------------------------------
if [ $# != 1 ]
then
  prg=`basename $0`
  echo usage $prg path_to_file
  exit 1
fi
#--------------------------------------------------------------------
SIZE0=x400
RESIZE0=x400
#--------------------------------------------------------------------
DIR=`dirname $1`
FILE=`basename $1`
TEMP=`mktemp`
TEMP_DIR=`dirname $TEMP`
TEMP_FILE=`basename $TEMP`
#--------------------------------------------------------------------
EXT=`expr match "$FILE" '.*\(\.[^.]*$\)'`
EXT=${EXT: 1}
N=${#FILE}
M=${#EXT}
N=`expr $N - 1 - $M`
ID=${FILE:0:N}
MIME=`file -ib $1`
MIME=`expr "$MIME" : '\(^[^ ]*\)'`
N=`expr index "$MIME" ";"`
if [ $N -gt 0 ]
then
  N=`expr $N - 1`
  MIME=${MIME:0:N}
fi
PREV_FILE=$DIR/$ID.0.jpg
#--------------------------------------------------------------------
#echo $MIME
case $MIME in
  #### plt,txt ####
  "text/plain" | "application/octet-stream")
    case $EXT in
      plt)
        hp2xx -m jpg -P 1 -q -h200 -M20 --center $1 --outfile $TEMP.jpg 2>&1>/dev/null
        convert -size $SIZE0 $TEMP.jpg -thumbnail $RESIZE0 -quality 10 $PREV_FILE
        ;;
      txt)
        a2ps --columns=1 -B -R -a 1 -o $TEMP.ps $1
        gs -dSAFER -dBATCH -dNOPAUSE -r50 -sDEVICE=png16m "-sOutputFile=$TEMP.png" $TEMP.ps
        convert -size $SIZE0 $TEMP.png -thumbnail $RESIZE0 -quality 10 $PREV_FILE
        ;;
    esac
    ;;
  #### ps ####
  "text/html")
    html2ps -f html2ps.ini $1 > $TEMP.ps
    gs -dSAFER -dBATCH -dNOPAUSE -r50 -sDEVICE=png16m "-sOutputFile=$TEMP.png" $TEMP.ps
    convert -size $SIZE0 $TEMP.png -thumbnail $RESIZE0 -quality 10 $PREV_FILE
    ;;
  #### ps ####
  "application/postscript")
    gs -dSAFER -dBATCH -dNOPAUSE -r50 -sDEVICE=png16m "-sOutputFile=$TEMP.png" $1
    convert -size $SIZE0 $TEMP.png -thumbnail $RESIZE0 -quality 10 $PREV_FILE
    ;;
  #### pdf ####
  "application/pdf")
    gs -dSAFER -dBATCH -dNOPAUSE -r50 -sDEVICE=png16m "-sOutputFile=$TEMP.png" $1
    convert -size $SIZE0 $TEMP.png -thumbnail $RESIZE0 -quality 10 $PREV_FILE
    ;;
  #### png,jpg,gif ####
  "image/png" | "image/jpeg" | "image/gif")
    convert -size $SIZE0 $1 -thumbnail $RESIZE0 -quality 10 $PREV_FILE
    ;;
esac
#--------------------------------------------------------------------
if [ -e $PREV_FILE ]
then
  chmod 0666 $PREV_FILE
fi
rm -f $TEMP*
#--------------------------------------------------------------------
exit 0
