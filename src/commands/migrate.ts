#!/usr/bin/env node
/********************************************************************************
 * Copyright (C) 2022. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/
/* eslint-disable @typescript-eslint/no-var-requires */
const prompts = require('prompts');
import * as path from 'path';
import * as fs from 'fs';
import { pack } from './pack';

interface IExtensionManifest {
    name: string;
    displayName?: string;
    publisher: string;
    version: string;
    engines: { [K in 'codearts' | 'vscode']?: string };
    description?: string;
    main?: string;
    browser?: string;
    icon?: string;
    categories?: string[];
    keywords?: string[];
    activationEvents?: string[];
    extensionDependencies?: string[];
    extensionPack?: string[];
    extensionKind?: any;
    contributes?: any;
    repository?: { url: string };
    bugs?: { url: string };
    enabledApiProposals?: readonly string[];
    api?: string;
    scripts?: { [key: string]: string };
    capabilities?: any;
}

const promptMsg =
    'Convert vsix plugin to carts for use on codearts, this process will change some of your configuration items, do you agree?';

const VSCODE_API_VERSION = '1.69.0';
const CODEARTS_VERSION = '^2.0.0';

(async () => {
    const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: promptMsg,
        initial: true
    });

    if (response.value !== true) {
        return;
    }
    const configPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(configPath)) {
        console.error('Package.json file is not found in the current project directory, please check.');
        return;
    }
    let configs;
    try {
        configs = JSON.parse(fs.readFileSync(configPath).toString());
    } catch (e) {
        console.error(e);
        return;
    }
    const newConfigs = migrateConfig(configs);
    try {
        fs.writeFileSync(configPath, JSON.stringify(newConfigs, null, '\t'));
        console.log('🎉  Migrate succeeded, start packing ……');
        pack('production', [], [], true);
    } catch (e) {
        console.error(e);
        return;
    }
})();

function migrateConfig(configs: IExtensionManifest) {
    // Add pack script to manifest
    const packScript = { pack: 'codearts-pack -p' };
    if (configs.scripts) {
        Object.assign(configs.scripts, packScript);
    } else {
        configs.scripts = packScript;
    }
    // Change engines to codearts
    if (configs.engines && configs.engines.vscode && validVersion(configs.engines.vscode)) {
        configs.engines = {
            codearts: CODEARTS_VERSION
        };
    }
    return configs;
}

// To check if the current version is lower than the vscode api version of codearts
function validVersion(version: string) {
    const currentVersion = version.startsWith('^') ? version.substring(1) : version;
    return VSCODE_API_VERSION.localeCompare(currentVersion, undefined, { numeric: true, sensitivity: 'base' }) > -1;
}
