/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as glob from 'glob-promise';
import * as micromatch from 'micromatch';
import * as path from 'path';
import { getInstalledPkgs, doPrepare } from './dependencies';
import { zip } from './archiver';
import * as readPkg from 'read-pkg';
import { PackType } from './pack-configuration';
import { fileMatch } from './file-matcher';

const ProdDefaultExclude = [
    '.gitignore',
    '.vscodeignore',
    '.prettierrc',
    '.prettierignore',
    '.eslintrc*',
    'tsconfig.json',
    'tsfmt.json',
    'webpack.config.js',
    'yarn-error.log',
    'yarn.lock',
    'npm-debug.log',
    'package-lock.json',
    'pack-config.json',
    'src/**/*',
    '**/*.map',
    '*.carts'
];

const MicromatchOptions: micromatch.Options = { dot: true };

/**
 * Filter the files based on the packaging rules to generate the final folder to be reached.
 */
/* eslint-disable prettier/prettier */
export class Packing {
    private pluginRootFolder: string;
    private packMode: PackType;
    private dependencies: string[] = [];
    private toZipFiles: string[] = [];
    private modeIgnore: string[] = [];
    private ignoreFiles: string[] = [];
    private allFiles: string[] = [];
    private userIgnore: string[];
    private includeFiles: string[];

    constructor(mode: PackType, userIgnore: string[], includeFiles: string[], allFiles: string[]) {
        this.pluginRootFolder = path.resolve(process.cwd());
        this.packMode = mode;
        this.userIgnore = userIgnore;
        this.includeFiles = includeFiles;
        this.allFiles = allFiles;
    }

    public async start(skipPrepare: boolean): Promise<string | void> {
        if (!skipPrepare) {
            await doPrepare();
        }
        this.dependencies = await getInstalledPkgs();

        const globOptions = {
            nocase: true,
            nosort: true,
            ignore: ['node_modules/**', '*.carts', '.git/**', '.arts/**'],
            nodir: true,
            dot: true
        };

        this.toZipFiles = !this.dependencies.length
            ? []
            : this.toZipFiles.concat.apply(
                [],
                await Promise.all(
                    this.dependencies.map((dependencyDirectory) => {
                        return glob
                            .promise('**', Object.assign(globOptions, { cwd: dependencyDirectory }))
                            .then((data) => data.map((name) => path.join(dependencyDirectory, name)));
                    })
                )
            );

        this.toZipFiles = this.toZipFiles.concat(
            await glob
                .promise('**', Object.assign(globOptions, { cwd: this.pluginRootFolder }))
                .then((data: string[]) => data.map((name) => path.join(this.pluginRootFolder, name)))
        );

        return await this.doExclude();
    }

    private async doExclude() {
        if (this.userIgnore) {
            this.checkNecessary(this.userIgnore);
        }
        this.modeIgnore = this.packMode === 'production' ? [...this.userIgnore, ...ProdDefaultExclude] : this.userIgnore;

        const pkgInfo = await readPkg();
        const { publisher, name, version } = pkgInfo;
        let moduleName = publisher ? `${publisher.toLowerCase()}.${name}` : name;
        if (version) {
            moduleName += `-${version}`;
        }
        const zipPath = path.resolve(this.pluginRootFolder + path.sep + moduleName + '.carts');

        this.toZipFiles = this.toZipFiles.map(f => f.split(path.sep).join('/')).filter((file) => {
            const isIgnored = !micromatch.contains(file, this.modeIgnore, MicromatchOptions) || micromatch.contains(file, this.includeFiles, MicromatchOptions);
            if (isIgnored) {
                this.ignoreFiles.push(file);
            }
            return isIgnored;
        });

        if (this.userIgnore.length || this.packMode === 'production') {
            console.log(
                'Excluded files:\n',
                this.ignoreFiles.filter(f => !f.includes('node_modules'))
            );
        }

        if (this.toZipFiles.length > 5000) {
            console.log(`This extension consists of ${this.toZipFiles.length} files, you could exclude unnecessary files by adding them to your pack-config.json:https://github.com/huaweicloud/cloudide-plugin-packager/tree/codearts`);
        }

        const result = await zip(this.toZipFiles, zipPath, this.pluginRootFolder).catch((e) => console.error(e));
        return result;
    }

    private doInclude() {
        if (!this.includeFiles.length || this.packMode === 'development') {
            return;
        }
        this.includeFiles.forEach((file) => {
            if (this.modeIgnore.indexOf(file) !== -1) {
                this.modeIgnore.splice(this.modeIgnore.indexOf(file), 1);
            }
        });
    }

    private checkNecessary(list: string[]) {
        list.forEach((item) => {
            if (item === 'package.json' || item === 'README.md') {
                console.warn('\n⚠️ Exclude "' + item + '" may cause problem with the package.');
            }
        });
    }

    private fuzzyMatch(list: string[]) {
        this.allFiles.forEach((file) => {
            const filePath = file.split(path.sep).join('/');
            list.forEach((rule) => {
                const filter = fileMatch(rule);
                if (filter(filePath)) {
                    this.modeIgnore.push(filePath);
                }
            });
        });
    }
}
