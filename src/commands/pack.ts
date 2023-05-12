/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as path from 'path';
import * as fs from 'fs';
import * as readPkg from 'read-pkg';
import { Packing } from '../common/packing';
import { PackType } from '../common/pack-configuration';
import { Manifest } from '../common/manifest';
import { checkManifest, checkPackageFiles } from '../common/util';
import * as micromatch from 'micromatch';

const pluginRootFolder = path.resolve(process.cwd());
const defaultExcludeFolders = ['node_modules', '.git'];

/**
 * Packing pre-operations to filter out files to be excluded and included.
 * @param type pack type: production/development
 * @param excludeFiles files array to exclude
 * @param includeFiles files array to include
 * @param skipPrepare skip npm install
 */
export async function pack(
    type: PackType,
    excludeFiles: string[],
    includeFiles: string[],
    skipPrepare: boolean
): Promise<void | string> {
    const pkg = (await readPkg()) as Manifest;
    if (!(await checkManifest(pkg))) {
        return;
    }
    const checkFileResult = await checkPackageFiles();
    if (!checkFileResult) {
        return;
    }
    if (pkg.name.indexOf('.') !== -1) {
        console.warn('\x1B[43m WARNING \x1B[0m Package name can not include "." character.');
        return;
    }
    const allFiles = getAllFiles(pluginRootFolder).map((f) => f.split(path.sep).join('/'));

    checkRules([...excludeFiles, ...includeFiles]);
    getMatchFiles([...excludeFiles, ...includeFiles], allFiles);

    if (type === 'production') {
        return new Packing('production', excludeFiles, includeFiles, allFiles).start(skipPrepare);
    } else {
        return new Packing('development', excludeFiles, includeFiles, allFiles).start(skipPrepare);
    }
}

function checkRules(rules: string[]) {
    if (!rules.length) {
        return;
    }
    rules.forEach((rule) => {
        defaultExcludeFolders.forEach((item) => {
            if (rule.indexOf(item) !== -1) {
                console.warn(`\x1B[43m WARNING \x1B[0m You have changed the packaging mode of ${item}.`);
            }
        });
    });
}

function getMatchFiles(matchRules: string[], files: string[]) {
    if (!matchRules.length) {
        return;
    }
    const temps = [...Array(matchRules.length).fill(0)];
    files.forEach((file) => {
        matchRules.forEach((rule, index) => {
            if (micromatch.contains(file, rule)) {
                ++temps[index];
            }
        });
    });
    temps.forEach((temp, index) => {
        if (!temp && defaultExcludeFolders.every((e) => matchRules[index].indexOf(e) === -1)) {
            console.warn(`\x1B[43m WARNING \x1B[0m "${matchRules[index]}" does not match any files.`);
        }
    });
}

function getAllFiles(folder: string) {
    const allFiles: string[] = [];
    function findFile(folder: string) {
        const files = fs.readdirSync(folder);
        files.forEach((item) => {
            const fPath = path.join(folder, item);
            const stat = fs.statSync(fPath);
            if (defaultExcludeFolders.indexOf(item) !== -1) {
                return;
            }
            if (stat.isFile()) {
                allFiles.push(path.relative(pluginRootFolder, fPath));
            } else {
                findFile(fPath);
            }
        });
    }
    findFile(folder);
    return allFiles;
}
