#!/usr/bin/env node
/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as path from "path";
import * as fs from "fs";
import { pack } from "./commands/pack";
const program = require("commander");

program
  .description(
    `A tool that help you personalize packaging, you can also create a 'pack-config.json' file 
directly to set files you want to include or exclude like: { "exclude": [], "include": [] }.`
  )
  .option("-p, --production", "Exclude Unnecessary files during packaging.")
  .option(
    "-e, --exclude-file <file>",
    "Input file to exclude, or use batch matching with quotation marks.",
    (file: string, previous: string[]) => {
      return previous.concat(file);
    },
    []
  )
  .option(
    "-i, --include-file <file>",
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
  .option("-s, --skip-prepare", "Skip npm install before packing.")
  .parse(process.argv);

const configPath = path.resolve(process.cwd()) + "/pack-config.json";
let excludeFiles: string[] = [];
let includeFiles: string[] = [];
try {
  fs.accessSync(configPath);
  const configs = JSON.parse(
    fs.readFileSync(configPath, { encoding: "utf-8" })
  );
  const { exclude, include } = configs;
  excludeFiles =
    exclude && exclude.length
      ? program.excludeFile.concat(exclude)
      : program.excludeFile;
  includeFiles =
    include && include.length
      ? program.includeFile.concat(include)
      : program.includeFile;
} catch (err) {
  excludeFiles = program.excludeFile;
  includeFiles = program.includeFile;
}
if (program.production) {
  pack("production", excludeFiles, includeFiles, program.skipPrepare);
} else {
  pack("development", excludeFiles, includeFiles, program.skipPrepare);
}
