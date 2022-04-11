/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';

/**
 * Compresses the given folder as the plugin.
 * @param files  files array need to zip
 * @param zipPath output path
 * @param pluginRootFolder root folder
 */
/* eslint-disable prettier/prettier */
export function zip(files: string[], zipPath: string, pluginRootFolder: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => {
            console.log(
                '✔️  Packing completed: ' +
                zipPath +
                `\n If you have any problems during the process, please create an issue on github.
        (https://github.com/huaweicloud/cloudide-plugin-packager/issues/new)`
            );
            resolve();
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                reject(err);
            }
            console.warn(err);
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        files.forEach((file) => {
            archive.file(file, { name: path.relative(pluginRootFolder, file) });
        });

        archive.finalize();
    });
}
