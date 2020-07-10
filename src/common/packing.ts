/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as fs from "fs";
import * as glob from "glob-promise";
import * as micromatch from "micromatch";
import * as path from "path";
import { getDependencies } from "./dependencies";
import { zip } from "./archiver";
import * as ora from "ora";
import * as readPkg from "read-pkg";
import { PackType } from './pack-configuration';
import { fileMatch } from './file-matcher';

export class Packing {
    private pluginRootFolder: string;
    private packMode: PackType;
    private dependencies: string[] = [];
    private toZipFiles: string[] = [];
    private modeIgnore: string[] = [];
    private allFiles: string[] = [];
    private userIgnore: string[];
    private includeFiles: string[];

    constructor(mode: PackType, userIgnore: string[], includeFiles: string[]) {
        this.pluginRootFolder = path.resolve(process.cwd());
        this.packMode = mode;
        this.userIgnore = userIgnore;
        this.includeFiles = includeFiles;
        this.getAllFiles(this.pluginRootFolder);
    }

    public async start() {
        const spinner = ora({
            text: "Installing npm dependencie……",
            color: "yellow"
        }).start();
        this.dependencies = await getDependencies();
        const globOptions = { nocase: true, nosort: true, ignore: ["node_modules/**", "*.cloudide"], nodir: true, dot: true };

        this.toZipFiles = this.toZipFiles.concat.apply([],
            await Promise.all(this.dependencies.map((dependencyDirectory) => {
                return glob.promise("**", Object.assign(globOptions, { cwd: dependencyDirectory }))
                    .then((data) => data.map((name) => path.join(dependencyDirectory, name)));
            })));

        this.toZipFiles = this.toZipFiles.concat(
            await (glob.promise("**", Object.assign(globOptions, { cwd: this.pluginRootFolder }),
            )).then((data: string[]) => data.map((name) => path.join(this.pluginRootFolder, name))));

        spinner.stop().clear();
        await this.doExclude();
    }

    private async doExclude() {
        if (this.userIgnore) {
            this.checkNecessary(this.userIgnore);
        }
        if (this.packMode === 'production') {
            const checkList = [".git", ".gitignore", 'tsconfig.json', 'tsfmt.json', 'webpack.config.js',
                'yarn-error.log', 'yarn.lock', 'npm-debug.log', 'package-lock.json', 'src/**/*', '**/*.map', '*.cloudide'];
            await this.fuzzyMatch(checkList);
        }
        await this.doInclude();

        const pkgInfo = await readPkg();
        const { publisher, name, version } = pkgInfo;
        let moduleName = publisher ? `${publisher.toLowerCase()}.${name}` : name;
        if (version) {
            moduleName += `-${version}`;
        }
        const zipPath = path.resolve(this.pluginRootFolder + path.sep + moduleName + ".cloudide");

        this.toZipFiles = this.toZipFiles.filter((file) => {
            const relativeFile = path.relative(this.pluginRootFolder, file);
            return !micromatch.contains(relativeFile, this.userIgnore ? this.modeIgnore.concat(this.userIgnore) : this.modeIgnore);
        });

        if (this.userIgnore.length || this.packMode === 'production') {
            console.log('Excluding files:\n', this.modeIgnore.concat(this.userIgnore));
        }
        return zip(this.toZipFiles, zipPath, this.pluginRootFolder);
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
            if (item == 'package.json' || item == 'README.md') {
                console.warn('\n❗ Exclude "' + item + '" may cause problem with the package.');
            }
        });
    }

    private fuzzyMatch(list: string[]) {
        this.allFiles.forEach((file) => {
            list.forEach((rule) => {
                let filter = fileMatch(rule);
                if (filter(file)) {
                    this.modeIgnore.push(file);
                }
            });
        });
    }

    public getAllFiles(folder: string) {
        fs.readdir(folder, (err, files) => {
            if (err) { throw err; }
            files.forEach(file => {
                if (file === 'node_modules' || file === '.git') {
                    return;
                }
                const fPath = path.join(folder, file);
                fs.stat(fPath, (err, stat) => {
                    if (err) { throw err; }
                    if (stat.isFile()) {
                        this.allFiles.push(path.relative(this.pluginRootFolder, fPath));
                    } else {
                        this.getAllFiles(fPath);
                    }
                });
            });
        });
    }
}
