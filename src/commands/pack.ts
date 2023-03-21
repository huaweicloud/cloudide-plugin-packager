/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as path from 'path';
import * as fs from 'fs';
import * as readPkg from 'read-pkg';
import { Packing } from '../common/packing';
import { PackType, CheckType, SpecialFiles } from '../common/pack-configuration';
import { fileMatch } from '../common/file-matcher';
import { Manifest } from '../common/manifest';
import { checkManifest, checkPackageFiles } from '../common/util';

const pluginRootFolder = path.resolve(process.cwd());
const specialFiles: SpecialFiles = { include: [], exclude: [] };
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
    const allFiles = await getAllFiles(pluginRootFolder);
    if (excludeFiles.length) {
        await checkRules(excludeFiles);
        await getMatchFiles('exclude', excludeFiles, allFiles);
    }
    if (includeFiles.length) {
        await checkRules(includeFiles);
        await getMatchFiles('include', includeFiles, allFiles);
    }
    const { exclude, include } = specialFiles;
    if (type === 'production') {
        return new Packing('production', exclude, include, allFiles).start(skipPrepare);
    } else {
        return new Packing('development', exclude, include, allFiles).start(skipPrepare);
    }
}

function checkRules(rules: string[]) {
    rules.forEach((rule) => {
        defaultExcludeFolders.forEach((item) => {
            if (rule.indexOf(item) !== -1) {
                console.warn(`\x1B[43m WARNING \x1B[0m Can not change the packaging mode of ${item}.`);
            }
        });
    });
}

function getMatchFiles(type: CheckType, matchRules: string[], files: string[]) {
    const matchFiles: string[] = [];
    const temps = [...Array(matchRules.length).fill(0)];
    files.forEach((file) => {
        matchRules.forEach((rule, index) => {
            const filter = fileMatch(transformSeparator(rule));
            if (filter(file)) {
                ++temps[index];
                matchFiles.push(file);
            }
        });
    });
    temps.forEach((temp, index) => {
        if (!temp && defaultExcludeFolders.indexOf(matchRules[index]) === -1) {
            console.warn(`\x1B[43m WARNING \x1B[0m "${matchRules[index]}" does not match any files.`);
        }
    });
    specialFiles[type] = matchFiles;
    return matchFiles;
}

function transformSeparator(rule: string) {
    const absolutePath = path.resolve(rule);
    return path.relative(pluginRootFolder, absolutePath);
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
            if (stat.isFile() === true) {
                allFiles.push(path.relative(pluginRootFolder, fPath));
            } else {
                findFile(fPath);
            }
        });
    }
    findFile(folder);
    return allFiles;
}
