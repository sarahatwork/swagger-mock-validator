"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
class FileSystem {
    readFile(fileName) {
        return new Promise((resolve, reject) => {
            fs.readFile(fileName, (error, file) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(file.toString());
                }
            });
        });
    }
}
exports.FileSystem = FileSystem;
