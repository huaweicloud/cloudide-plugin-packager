/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as path from "path";
import * as fs from "fs";
import { Packing } from "../common/packing";
import { PackType, CheckType, SpecialFiles } from '../common/pack-configuration';
import { fileMatch } from '../common/file-matcher';
import { detection } from '../common/detection';

const pluginRootFolder = path.resolve(process.cwd());
const specialFiles: SpecialFiles = { 'include': [], 'exclude': [] };
const defaultExcludeFolders = ['node_modules', '.git'];

export async function pack(type: PackType, excludeFiles: string[], includeFiles: string[]) {
    const checkValid = detection(false);
    if (!checkValid) return;
    
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
        new Packing('production', exclude, include, allFiles).start();
    } else {
        new Packing('development', exclude, include, allFiles).start();
    }
}

function checkRules(rules: string[]) {
    rules.forEach((rule) => {
        defaultExcludeFolders.forEach((item) => {
            if (rule.indexOf(item) !== -1) {
                console.warn(`⚠️ Can not change the packaging mode of ${item}.`);
            }
        });
    });
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
        if (!temp && defaultExcludeFolders.indexOf(matchRules[index]) === -1) {
            console.warn(`⚠️ "${matchRules[index]}" does not math any files.`)
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
