/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import * as cp from "child_process";

export function shellExec(commandLine: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const process = cp.exec(commandLine, (error, stdout) => {
            const exitCode = (process as any).exitCode;
            if (error) {
                reject(new Error('Unable to execute the command ' + commandLine + ': ' + error));
            }
            if (exitCode !== 0) {
                reject(new Error('Invalid exit code ' + exitCode));
            }
            resolve(stdout);
        });
    });
}
