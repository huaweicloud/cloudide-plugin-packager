/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { spawn, spawnSync } from 'child_process';
import * as path from 'path';

/**
 * Run `npm i` and `npm list --parseable--prod` to get dependencies.
 */
export function getInstalledPkgs(): Promise<string[]> {
    console.log('Excuting packing...');
    return new Promise<string[]>((resolve, reject) => {
        const list = spawn('npm', ['list', '--parseable', '--prod', '--depth=99999'], { shell: true });
        let dependencies: string[] = [];
        list.stdout.on('data', (data: Buffer) => {
            dependencies = data
                .toString()
                .split(/[\r\n]/)
                .filter((dir) => path.isAbsolute(dir));
        });
        list.stderr.on('data', (err: Buffer) => {
            console.error(`${err}`);
        });
        list.on('close', (code: number) => {
            if (code !== 0) {
                console.error(
                    '\x1B[41m ERROR \x1B[0m Run npm list failed, please delete node_modules and run npm install, then try again.'
                );
                reject(new Error(`Npm list process exited with code ${code}`));
            } else {
                resolve(
                    dependencies.filter((value) => {
                        return value.indexOf('node_modules') !== -1;
                    })
                );
            }
        });
    });
}

export function doPrepare(): void {
    spawnSync('npm run prepare', [], { stdio: 'inherit', shell: true });
}
