import os
import io
import datetime
from google.cloud import storage
from googleapiclient.discovery import build
import googleapiclient.http
import google.auth
import functions_framework

DRIVE_FOLDER_ID = 'xxxxxxxxxxxxxxxxxxxxxxxxx'  # TODO: Replace with Drive Folder ID
BUCKET_NAME     = 'xxxxxxxxx'                  # TODO: Replace with Bucket Name
CHECKPOINT_FILE = 'sync_checkpoint.txt'

def get_last_scan_time(bucket):
    blob = bucket.blob(CHECKPOINT_FILE)
    if not blob.exists():
        return '2000-01-01T00:00:00Z'
    return blob.download_as_string().decode('utf-8')

def save_new_checkpoint(bucket, new_time):
    blob = bucket.blob(CHECKPOINT_FILE)
    blob.upload_from_string(new_time)

@functions_framework.http
def sync_drive_to_gcs(request):
    if request.args.get('reset') == 'true':
        try:
            storage_client = storage.Client()
            bucket = storage_client.bucket(BUCKET_NAME)
            blob = bucket.blob(CHECKPOINT_FILE)
            if blob.exists():
                blob.delete()
            return "Checkpoint reset successfully!", 200
        except Exception as e:
            return f"Error resetting: {str(e)}", 500

    try:
        credentials, project = google.auth.default(
            scopes=[
                'https://www.googleapis.com/auth/drive.readonly',
                'https://www.googleapis.com/auth/devstorage.read_write'
            ]
        )
        drive_service = build('drive', 'v3', credentials=credentials)
        gcs_client    = storage.Client(credentials=credentials)
        bucket        = gcs_client.bucket(BUCKET_NAME)

        last_scan_time = get_last_scan_time(bucket)
        query = (f"'{DRIVE_FOLDER_ID}' in parents and "
                 f"(mimeType = 'image/tiff' or name contains '.tif' or name contains '.tiff') and "
                 f"modifiedTime > '{last_scan_time}' and trashed = false")

        results = drive_service.files().list(
            q=query,
            fields="files(id, name, mimeType, modifiedTime)",
            pageSize=100
        ).execute()
        files = results.get('files', [])

        if not files:
            return "OK - No new files", 200

        max_modified_time = datetime.datetime.fromisoformat(last_scan_time.replace('Z', '+00:00'))

        for file in files:
            file_id, file_name = file['id'], file['name']
            if 'vnd.google-apps' in file.get('mimeType', ''):
                continue

            print(f"Syncing: {file_name}")
            drive_request = drive_service.files().get_media(fileId=file_id)
            blob = bucket.blob(file_name)

            with io.BytesIO() as buffer:
                downloader = googleapiclient.http.MediaIoBaseDownload(
                    buffer, drive_request, chunksize=5*1024*1024
                )
                with blob.open("wb") as gcs_file:
                    done = False
                    while not done:
                        status, done = downloader.next_chunk()
                        buffer.seek(0)
                        gcs_file.write(buffer.read())
                        buffer.seek(0)
                        buffer.truncate(0)

            file_mod_time = datetime.datetime.fromisoformat(
                file['modifiedTime'].replace('Z', '+00:00')
            )
            if file_mod_time > max_modified_time:
                max_modified_time = file_mod_time

        new_checkpoint = (
            max_modified_time + datetime.timedelta(seconds=1)
        ).isoformat().replace('+00:00', 'Z')
        save_new_checkpoint(bucket, new_checkpoint)

        return f"OK - Synchronized {len(files)} files", 200
    except Exception as e:
        return f"Error: {str(e)}", 500
