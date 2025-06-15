
import AWS from 'aws-sdk';

// ===== ЗАМЕНИТЕ ниже на ваши реальные параметры S3! =====
const s3 = new AWS.S3({
  accessKeyId: "ВАШ_S3_ACCESS_KEY_ID", // замените на свой ключ
  secretAccessKey: "ВАШ_S3_SECRET_ACCESS_KEY", // замените на свой секрет
  endpoint: "ВАШ_S3_ENDPOINT", // например, "https://s3.eu-central-1.amazonaws.com"
  region: "ВАШ_S3_REGION", // например, "eu-central-1"
  s3ForcePathStyle: true,
  signatureVersion: "v4"
});
export default s3;
