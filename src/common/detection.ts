/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as readPkg from 'read-pkg';

let warnIcon = '⚠️ ';
export function detection(needBlock: Boolean): Boolean {
    if (needBlock) {
        warnIcon = '❗️ ';
    }
    if(!checkNecessaryFiles(needBlock)) return false;
    if(!checkPackageValid(needBlock)) return false;
    if(!checkFieldLength(needBlock)) return false;
    return true;
}

function checkNecessaryFiles(block: Boolean): Boolean {
    const packagePath = path.resolve(process.cwd()) + '/package.json';
    const readmePath = path.resolve(process.cwd()) + '/README.md';
  
    if (!fsExistsSync(packagePath)) {
        console.warn(`${warnIcon} Package.json is necessary.`);
        return false;
    }
    if (!fsExistsSync(readmePath)) {
        console.warn(`${warnIcon} README.md is necessary.`);
        if (block) return false;
    }
    return true;
}

function checkPackageValid(block: Boolean): Boolean {
    const { name, publisher, version } = readPkg.sync();
    const versionRule = /^\d+(.\d+){0,2}$/;
    if (!name) {
        console.warn(`${warnIcon} 'name' cannot be missing in package.json.`);
        if (block) return false;
    }
    if (!publisher) {
        console.warn(`${warnIcon} 'publisher' cannot be missing in package.json.`);
        if (block) return false;
    }
    if (!version) {
        console.warn(`${warnIcon} 'version' cannot be missing in package.json.`);
        if (block) return false;
    }
    if (name && name.indexOf('.') !== -1) {
        console.warn(`${warnIcon} Package name can not include '.' character.`);
        if (block) return false;
    }
    if (version && !versionRule.test(version)) {
        console.warn(`${warnIcon} Version should be three numbers separated by '.'. `);
        if (block) return false;
    }
    return true;
}

function checkFieldLength(block: Boolean): Boolean {
    const { name, description, keywords, icon } = readPkg.sync();
    if (name && strLength(name) > 255) {
        console.warn(`${warnIcon} 'name' value exceeds 255 characters. `);
        if (block) return false;
    }
    if (description && strLength(description) > 255) {
        console.warn(`${warnIcon} 'description' value exceeds 255 characters. `);
        if (block) return false;
    }
    if (keywords && strLength(JSON.stringify(keywords)) > 600) {
        console.warn(`${warnIcon} 'description' value exceeds 600 characters. `);
        if (block) return false;
    }
    if (icon && strLength(icon) > 255) {
        console.warn(`${warnIcon} 'icon' value exceeds 255 characters. `);
        if (block) return false;
    }
    return true;
}

function strLength(str: string) {
    return str.replace(/[^\x00-\xff]/g, '01').length;
}

function fsExistsSync(path: string) {
    try {
        fs.accessSync(path);
    } catch (err) {
        return false;
    }
    return true;
}
