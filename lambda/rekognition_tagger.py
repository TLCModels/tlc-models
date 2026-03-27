import json
import boto3
import os

rekognition = boto3.client('rekognition', region_name='us-east-2')
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table(os.environ.get('TALENT_TABLE', 'TLCTalentProfiles'))

def lambda_handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Detect faces and attributes
        response = rekognition.detect_faces(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            Attributes=['ALL']
        )

        # Detect labels (scene, clothing, etc.)
        labels_response = rekognition.detect_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            MaxLabels=20,
            MinConfidence=80
        )

        tags = []
        face_details = {}

        if response['FaceDetails']:
            face = response['FaceDetails'][0]
            age_range = face.get('AgeRange', {})
            face_details = {
                'age_low': age_range.get('Low', 0),
                'age_high': age_range.get('High', 0),
                'gender': face.get('Gender', {}).get('Value', 'Unknown'),
                'smile': face.get('Smile', {}).get('Value', False),
                'eyeglasses': face.get('Eyeglasses', {}).get('Value', False),
                'beard': face.get('Beard', {}).get('Value', False),
                'mustache': face.get('Mustache', {}).get('Value', False),
                'emotions': [e['Type'] for e in face.get('Emotions', []) if e['Confidence'] > 70]
            }

        labels = [label['Name'] for label in labels_response['Labels']]
        tags = labels

        # Extract talent ID from filename (e.g., talent-123-photo-01.webp)
        talent_id = key.split('/')[1] if '/' in key else key.split('-')[0]

        # Update DynamoDB
        try:
            table.update_item(
                Key={'talent_id': talent_id},
                UpdateExpression='SET photo_tags = :tags, face_attributes = :face, last_photo_analyzed = :key',
                ExpressionAttributeValues={
                    ':tags': tags,
                    ':face': face_details,
                    ':key': key
                }
            )
        except Exception as e:
            print(f"DynamoDB update failed for {talent_id}: {str(e)}")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'talent_id': talent_id,
                'tags': tags,
                'face_details': face_details
            })
        }
