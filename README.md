## About
Private project for syncing abhome door QR database between local (slave) and cloud (master) database

## To start
1. ```npm install```

2. Create and fill `.env` file, make sure to give `SYNC_INTERVAL` generous amount. `SYNC_INTERVAL` is in minute

3. Replicate the database

4. Create cron job
```*/5 * * * * cd /path/to/your/project && npm run start```
The cron job will run every 5 minutes