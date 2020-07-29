/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

const { spawn } = require('child_process');

/**
 * Run `npm i` and `npm list --parseable--prod` to get dependencies.
 * If user run pack command with `-s`, skip `npm i` and pack directly.
 */
export function getDependencies(skipPrepare: boolean): Promise<string[]> {
    if (skipPrepare) {
        console.log('Excuting packing...');
        return getInstalledPkgs();
    }
    console.log('Excuting npm install...');
    return new Promise<string[]>((resolve, reject) => {
        const install = spawn('npm', ['i'], { stdio: 'inherit' });
        install.on('close', (code: number) => {
            if (code !== 0) {
                console.error('❗️  Npm install failed, check your dependencies in package.json please.');
                reject(new Error(`Npm install process exited with code ${code}`));
            } else {
                getInstalledPkgs().then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    });
}

function getInstalledPkgs(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
        const list = spawn('npm', ['list', '--parseable', '--prod']);
        let dependencies: string[] = [];
        list.stdout.on('data', (data: Buffer) => {
            dependencies = data.toString().split('\n');
        });
        list.stderr.on('data', (err: Buffer) => {
            console.error(`${err}`);
        });
        list.on('close', (code: number) => {
            if (code !== 0) {
                console.error('❗️  Run npm list failed, please delete node_modules and run npm install, then try again.');
                reject(new Error(`Npm list process exited with code ${code}`));
            } else {
                resolve(dependencies.filter((value) => {
                    return value.indexOf('node_modules') !== -1;
                }));
            }
        });
    });
}
