/*
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This is the file that handles operations relates to assets
 */

/**
 * To save an uploaded asset
 * @param {String} type Type of the asset
 * @param {Object} fileRequest File object from request
 * @returns {String} message Detailed message on what happened during asset upload
 */
var addAsset = function (type, fileRequest) {
    var tempAssetPath = '/store/' + userDomain + '/fs/temp-' + type + '/';
    var ZipFile = Packages.java.util.zip.ZipFile;
    var zipExtension = ".zip";
    var process = require('process');
    var zipFile = process.getProperty('carbon.home') + '/repository/deployment/server/jaggeryapps/portal' + tempAssetPath;
    var assetPath = '/store/' + userDomain + '/fs/' + type + '/';
    var configurationFileName = type + ".json";
    var config = require('/configs/designer.json');
    var bytesToMB = 1048576;
    var fileSizeLimit = type === "gadget" ? config.assets.gadget.fileSizeLimit : config.assets.layout.fileSizeLimit;
    var log = new Log();
    
    // Before copying the file to temporary location, check whether the given file exist and
    // the file size and whether it is a zip file
    if (fileRequest === null) {
        return 'fileNotFound';
    } else if (fileRequest.getLength() / bytesToMB > fileSizeLimit) {
        return 'MaxFileLimitExceeded';
    } else if (fileRequest.getName().indexOf(zipExtension) < 0) {
        return 'notaZipFile';
    }

    // If it passes all the initial validations remove the zip file extensions to avoid the zip file being deployed
    // before other validations
    var fileName = fileRequest.getName().replace(zipExtension, "");
    var tempDirectory = new File(tempAssetPath);

    if (!tempDirectory.isExists()) {
        tempDirectory.mkdir();
    }

    var gadget = new File(tempAssetPath + fileName);
    gadget.open('w');
    gadget.write(fileRequest.getStream());
    gadget.close();

    try {
        // Extract the zip file and check whether there is a configuration file
        var zip = new ZipFile(zipFile + fileName);
        var fileInZip = zip.entries();

        for (var entries = fileInZip; entries.hasMoreElements();) {
            var entry = entries.nextElement();
            if ((entry.getName().toLowerCase() + "") === configurationFileName) {
                var assetDirectory = new File(assetPath);
                var files = assetDirectory.listFiles();

                // Check whether is there is another asset with same id
                for (var index = 0; index < files.length; index++) {
                    if (files[index].getName() === fileName) {
                        tempDirectory.del();
                        return 'idAlreadyExists';
                    }
                }
                // If there is a configuration file and no other assets with same id, deploy the asset
                var assetDir = new File(assetPath + fileRequest.getName());
                assetDir.open('w');
                assetDir.write(fileRequest.getStream());
                assetDir.close();
                tempDirectory.del();
                return 'success';
            }
        }
        // If configuration file is missing indicate the error
        tempDirectory.del();
        return 'confgurationFileMissing';
    } catch (e) {
        log.error('Error occurred while extracting the zip file.', e);
    }
};