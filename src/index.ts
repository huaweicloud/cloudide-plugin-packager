#!/usr/bin/env node
/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import leven from 'leven';
import { program } from 'commander';
import { pack } from './commands/pack';
import { publish } from './common/publish';
import { getPackageFiles } from './common/util';

interface PackageParams {
    production: string;
    excludeFile: string[];
    includeFile: string[];
    skipPrepare: boolean;
}

interface PublishParams {
    pat: string;
    packagePath: string[];
    type: string;
}

program
    .command('package')
    .description(
        `A tool that help you personalize packaging, you can also create a 'pack-config.json' file 
directly to set files you want to include or exclude like: { "exclude": [], "include": [] }.`
    )
    .option('-p, --production', 'Exclude Unnecessary files during packaging.')
    .option(
        '-e, --exclude-file <file>',
        'Input file to exclude, or use batch matching with quotation marks.',
        (file: string, previous: string[]) => {
            return previous.concat(file);
        },
        []
    )
    .option(
        '-i, --include-file <file>',
        `Input file to include, or use batch matching with quotation marks, match rule like:
                            src/**/*       match all files in src.
                            *.js           only match js files in current dir.
                            **/*.js        match all js files.
                            path/*.js      match js files in path.
                            !*.js          exclude js files in current dir.
                            .{jpg,png,gif} means jpg, png or gif`,
        (file: string, previous: string[]) => {
            return previous.concat(file);
        },
        []
    )
    .option('-s, --skip-prepare', 'Skip npm install before packing.')
    .action(({ production, excludeFile, includeFile, skipPrepare }: PackageParams) => {
        toPack({ production, excludeFile, includeFile, skipPrepare });
    });

program
    .command('publish')
    .description('Publishes an extension')
    .option('-p, --pat <token>', 'Personal Access Token')
    .option(
        '-i, --packagePath <paths...>',
        'Publish the provided CARTS packages.',
        (path: string, previous: string[]) => {
            return previous.concat(path);
        },
        []
    )
    .option(
        '-t, --type <type>',
        'Set the release type. "0" indicates the grayscale release, "1" indicates the official release, and the default is grayscale release.',
        '0'
    )
    .action(({ pat, packagePath, type }: PublishParams) => {
        toPublish({ pat, packagePath, type });
    });

program.on('command:*', ([cmd]: string) => {
    program.outputHelp((help: string) => {
        const availableCommands = program.commands.map((c: any) => c._name);
        const suggestion = availableCommands.find((c: string) => leven(c, cmd) < c.length * 0.4);

        help = `${help}
Unknown command '${cmd}'`;

        return suggestion ? `${help}, did you mean '${suggestion}'?\n` : `${help}.\n`;
    });
    process.exit(1);
});

program.parse(process.argv);

async function toPack({ production, excludeFile, includeFile, skipPrepare }: PackageParams) {
    const { excludeFiles, includeFiles } = await getPackageFiles(includeFile, excludeFile);
    if (production) {
        pack('production', excludeFiles, includeFiles, skipPrepare);
    } else {
        pack('development', excludeFiles, includeFiles, skipPrepare);
    }
}

function toPublish({ pat, packagePath, type }: PublishParams) {
    publish({ pat, packagePath, type });
}
