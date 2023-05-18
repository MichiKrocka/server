#!/bin/bash

#set certificates from letsenxrypt

sud certbot run --nginx -d koegler.dnshome.de  -d krocka.goip.de -d bermuda.goip.de --staple-ocsp --hsts
