#!/bin/bash

#set certificates from letsenxrypt

sudo certbot run --nginx -d koegler.dnshome.de -d krocka.goip.de -d krocka.dnshome.de -d bermuda.goip.de --staple-ocsp --hsts
