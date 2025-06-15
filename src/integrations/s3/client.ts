
import AWS from 'aws-sdk';

// TODO: Fill in these placeholders with your actual S3 endpoint and credentials
const s3 = new AWS.S3({
  accessKeyId: "YOUR_S3_ACCESS_KEY_ID",
  secretAccessKey: "YOUR_S3_SECRET_ACCESS_KEY",
  endpoint: "YOUR_S3_ENDPOINT", // e.g. "https://s3.your-provider.com"
  region: "us-east-1", // set your S3 region
  s3ForcePathStyle: true, // needed for S3-compatible providers
  signatureVersion: "v4"
});

export default s3;
