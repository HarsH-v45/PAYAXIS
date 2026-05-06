"use strict";
const fsp  = require("fs/promises");
const path = require("path");
const { getEnv } = require("../config/env");

async function upload(key, buffer, meta = {}) {
  const env = getEnv();
  if (env.STORAGE_DRIVER === "s3") return _uploadS3(key, buffer, meta, env);
  return _uploadLocal(key, buffer, env);
}

async function download(key) {
  const env = getEnv();
  if (env.STORAGE_DRIVER === "s3") {
    const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
    const s3  = new S3Client({ region: env.AWS_REGION });
    const res = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    const chunks = [];
    for await (const c of res.Body) chunks.push(c);
    return Buffer.concat(chunks);
  }
  return fsp.readFile(path.join(env.LOCAL_STORAGE_PATH, key));
}

async function _uploadS3(key, buffer, meta, env) {
  const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
  const { getSignedUrl }              = require("@aws-sdk/s3-request-presigner");
  const s3 = new S3Client({ region: env.AWS_REGION });
  await s3.send(new PutObjectCommand({ Bucket:env.S3_BUCKET, Key:key, Body:buffer, ContentType:meta.ContentType||"application/pdf", ServerSideEncryption:"AES256" }));
  return getSignedUrl(s3, new (require("@aws-sdk/client-s3").GetObjectCommand)({ Bucket:env.S3_BUCKET, Key:key }), { expiresIn:604800 });
}

async function _uploadLocal(key, buffer, env) {
  const full = path.join(env.LOCAL_STORAGE_PATH, key);
  await fsp.mkdir(path.dirname(full), { recursive:true });
  await fsp.writeFile(full, buffer);
  return `/static/${key}`;
}

module.exports = { upload, download };
