#!/bin/bash
mkdir -p ./mongo-backups
docker exec mongodb mongodump --archive | gzip > ./mongo-backups/backup-$(date +%F_%H-%M-%S).gz
