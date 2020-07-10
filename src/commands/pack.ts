/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as path from "path";
import * as fs from "fs";
import * as readPkg from "read-pkg";
import { Packing } from "../common/packing";
import { PackType, CheckType, SpecialFiles } from '../common/pack-configuration';
import { fileMatch } from '../common/file-matcher';

const pluginRootFolder = path.resolve(process.cwd());
const specialFiles: SpecialFiles = { 'include': [], 'exclude': [] };

export async function pack(type: PackType, excludeFiles: string[], includeFiles: string[]) {
    const moduleName = (await readPkg()).name;
    if (moduleName.indexOf('.') !== -1) {
        console.log(' ❗ Package name can not include "." character.');
        return;
    }
    const allFiles = await getAllFiles(pluginRootFolder);
    if (excludeFiles.length) {
        const rightRule = await checkRules(excludeFiles);
        if (!rightRule) return;
        const excludeMatchFiles = await getMatchFiles('exclude', excludeFiles, allFiles);
        if (!excludeMatchFiles.length) {
            return;
        }
    }
    if (includeFiles.length) {
        const rightRule = await checkRules(includeFiles);
        if (!rightRule) return;
        const includeMatchFiles = await getMatchFiles('include', includeFiles, allFiles);
        if (!includeMatchFiles.length) {
            return;
        }
    }
    const { exclude, include } = specialFiles;
    if (type == 'production') {
        new Packing('production', exclude, include).start();
    } else {
        new Packing('development', exclude, include).start();
    }
}

function checkRules(list: string[]) {
    let rightRule = true;
    list.forEach((item) => {
        if (item.indexOf('node_modules') !== -1) {
            console.log(' ❗ Can not change the packaging mode of node_modules folder.');
            rightRule = false;
        } else if (item.indexOf('.git') !== -1) {
            console.log(' ❗ Can not change the packaging mode of .git folder.');
            rightRule = false;
        }
    });
    return rightRule;
}

function getMatchFiles(type: CheckType, matchRules: string[], files: string[]) {
    let matchFiles: string[] = [];
    let temps = [...Array(matchRules.length).fill(0)];
    files.forEach((file) => {
        matchRules.forEach((rule, index) => {
            let filter = fileMatch(rule);
            if (filter(file)) {
                ++temps[index];
                matchFiles.push(file);
            }
        });
    });
    temps.forEach((temp, index) => {
        if (!temp) {
            console.log(`❗ "${matchRules[index]}" does not math any files.`)
        }
    })
    specialFiles[type] = matchFiles;
    return matchFiles;
}

function getAllFiles(folder: string) {
    let allFiles: string[] = [];
    function findFile(folder: string) {
        let files = fs.readdirSync(folder);
        files.forEach((item, index) => {
            let fPath = path.join(folder, item);
            let stat = fs.statSync(fPath);
            if (item === 'node_modules' || item === '.git') {
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
