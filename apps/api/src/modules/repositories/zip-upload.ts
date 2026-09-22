import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

import multer from "multer";

const uploadDirectory = path.join(
  os.tmpdir(),
  "project-aegis-uploads",
);

export const zipUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => {
      fs.mkdirSync(uploadDirectory, {
        recursive: true,
      });
      callback(null, uploadDirectory);
    },
    filename: (_request, _file, callback) => {
      callback(null, `${Date.now()}-${crypto.randomUUID()}.zip`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const acceptedType =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.mimetype === "application/octet-stream";

    if (extension !== ".zip" || !acceptedType) {
      callback(new Error("Only ZIP archives are accepted."));
      return;
    }

    callback(null, true);
  },
});
