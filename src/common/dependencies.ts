/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as fs from 'fs-extra';
import * as path from 'path';
import { shellExec } from './shell';

export async function getDependencies(): Promise<string[]> {
    const result = await shellExec('npm i && npm list --parseable --prod');
    const dependencies = result.split('\n');

    return Promise.resolve(dependencies.filter((value) => {
        return value.split("node_modules").length === 2;
    }));
}
