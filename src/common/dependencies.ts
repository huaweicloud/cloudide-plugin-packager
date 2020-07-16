/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

const { spawn } = require('child_process');

export async function getDependencies(): Promise<string[]> {
    console.log('Excuting npm install...');
    return new Promise<string[]>((resolve, reject) => {
        const install = spawn('npm', ['i'], { stdio: 'inherit' });
        install.on('close', (code: number) => {
            if (code !== 0) {
                console.warn('⚠️ Npm install failed, check your dependencies in package.json please.');
                reject(new Error(`Npm install process exited with code ${code}`));
            } else {
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
                        console.warn('⚠️ Run npm list failed, delete node_modules and try again please.');
                        reject(new Error(`Npm list process exited with code ${code}`));
                    } else {
                        resolve(dependencies.filter((value) => {
                            return value.indexOf('node_modules') !== -1;
                        }));
                    }
                });
            }
        });
    });
}
