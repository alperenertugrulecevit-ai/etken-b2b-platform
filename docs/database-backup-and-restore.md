# Etken B2B Veritabanı Yedekleme ve Geri Yükleme

- Cloud Run Job: `etken-b2b-database-backup`
- Cloud Scheduler: `etken-b2b-nightly-database-backup`
- Çalışma zamanı: Her gece 02:30 Europe/Istanbul
- Bucket: `gs://etken-b2b-production-database-backups`
- Saklama süresi: 90 gün
- Silme koruması: 7 gün

## Son yedeği doğrulama

```bash
export BACKUP_BUCKET="etken-b2b-production-database-backups"
./infra/backup/verify-backup.sh
```

## Yedekleri listeleme

```bash
gcloud storage ls -l gs://etken-b2b-production-database-backups/daily/
```

## Test veritabanına geri yükleme

```bash
read -s -p "Hedef DATABASE_URL: " TARGET_DATABASE_URL
echo
export TARGET_DATABASE_URL
./infra/backup/restore.sh gs://BUCKET/daily/YEDEK.dump RESTORE
unset TARGET_DATABASE_URL
```

Production geri yükleme varsayılan olarak engellenmiştir. Yalnızca onaylı felaket kurtarma işleminde `ALLOW_PRODUCTION_RESTORE=true` kullanılmalıdır.
