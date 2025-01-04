const aws = require('aws-sdk');
const multer = require('multer');
var multerS3 = require('multer-s3-transform');
const sharp = require('sharp');

const spacesEndpoint = new aws.Endpoint(process.env.SPACE_ENDPOINT);
const s3 = new aws.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.ACCESSKEYID,
  secretAccessKey: process.env.SECRETACCESSKEY,
});

exports.upload3 = (folder, req) => multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.BUCKET,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, {
                fieldName: file.fieldname
            });
        },
        key: async function (req, file, cb) {
            let extension = file.originalname.split(".");
            cb(null, `${folder}/${extension[0]}${Date.now().toString()}.${extension[1]}`)
        },
        transform: function (req, file, cb) {
            cb(null, sharp().resize(100, 100))
        }
    })
})
