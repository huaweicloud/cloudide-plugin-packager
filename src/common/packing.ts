/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as fs from 'fs';
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
    '.editorconfig',
    '.npmrc',
    '.yarnrc',
    '.babelrc*',
    '.prettierrc*',
    '.commitlintrc*',
    '.gitattributes',
    '.github',
    '*.todo',
    'tsconfig.json',
    'tsfmt.json',
    'tslint.yaml',
    '.travis.yml',
    'appveyor.yml',
    'webpack.config.js',
    '.cz-config.js',
    'yarn-error.log',
    'yarn.lock',
    'npm-debug.log',
    'npm-shrinkwrap.json',
    'package-lock.json',
    'pack-config.json',
    '**/.git/**',
    '**/*.vsix',
    '**/.DS_Store',
    '**/*.vsixmanifest',
    '**/.vscode-test/**',
    '**/.vscode-test-web/**',
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
    private dependenciesFiles: string[] = [];
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

        const globOptions = {
            nocase: true,
            nosort: true,
            ignore: ['node_modules/**', '*.carts', '.git/**', '.arts/**'],
            nodir: true,
            dot: true
        };

        const includeDependencies = !this.userIgnore.some(ignore => ignore.startsWith('node_modules/*'));
        if (includeDependencies) {
            this.dependencies = await getInstalledPkgs();

            this.dependenciesFiles = !this.dependencies.length
                ? []
                : this.dependenciesFiles.concat.apply(
                    [],
                    await Promise.all(
                        this.dependencies.map((dependencyDirectory) => {
                            return glob
                                .promise('**', Object.assign(globOptions, { cwd: dependencyDirectory }))
                                .then((data) => data.map((name) => path.join(dependencyDirectory, name)));
                        })
                    )
                );
        }

        this.toZipFiles = this.toZipFiles.concat.apply(
            [],
            await glob
                .promise('**', Object.assign(globOptions, { cwd: this.pluginRootFolder }))
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

        this.toZipFiles = this.toZipFiles
            .map(f => f.split(path.sep).join('/'))
            .filter((file) => {
                const isMatch = !this.modeIgnore.some(i => micromatch.isMatch(file, i, MicromatchOptions)) || this.includeFiles.some(i => micromatch.isMatch(file, i, MicromatchOptions));
                if (!isMatch) {
                    this.ignoreFiles.push(file);
                }
                return isMatch;
            });

        if (this.userIgnore.length || this.packMode === 'production') {
            console.log('Excluded files:\n', this.ignoreFiles);
        }

        if (this.toZipFiles.length > 5000) {
            console.log(`This extension consists of ${this.toZipFiles.length} files, you could exclude unnecessary files by adding them to your pack-config.json:https://github.com/huaweicloud/cloudide-plugin-packager/tree/codearts`);
        }

        const result = await zip([...this.toZipFiles.map((name) => path.join(this.pluginRootFolder, name)), ...this.dependenciesFiles], zipPath, this.pluginRootFolder).catch((e) => console.error(e));
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
