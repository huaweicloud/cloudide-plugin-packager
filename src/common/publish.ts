import * as inquirer from 'inquirer';
import { Code, Status, StatusFailure, StatusResponse, StatusResponseError } from './api-interface';
import { ExtensionConfig, Manifest } from './manifest';
import { readCARTSPackage } from './zip';
import ApiService from './api';
import { getPackageFiles, uploadStream } from './util';
import { pack } from '../commands/pack';
import { AxiosError } from 'axios';

export interface IPublishOptions {
    readonly packagePath?: string[];

    /**
     * The location of the extension in the file system.
     *
     * Defaults to `process.cwd()`.
     */
    readonly cwd?: string;

    /**
     * The base URL for images detected in Markdown files.
     */
    readonly baseImagesUrl?: string;

    /**
     * The Personal Access Token to use.
     */
    readonly pat: string;
}

export async function publish(options: IPublishOptions): Promise<void> {
    if (!options.packagePath) {
        console.error('\x1B[41m ERROR \x1B[0m Package not found. Please check the package path is correct?');
        return;
    }
    if (options.packagePath.length > 0) {
        for (const packagePath of options.packagePath) {
            try {
                const carts = await readCARTSPackage(packagePath);
                await _publish(packagePath, carts.manifest, { ...options });
            } catch (error) {
                console.error(error);
            }
        }
    } else {
        // 用户未提供路径时，先打包插件在发布
        const { excludeFiles, includeFiles } = getPackageFiles([], []);
        const packagePath = await pack('production', excludeFiles, includeFiles, true);
        if (packagePath) {
            try {
                const carts = await readCARTSPackage(packagePath);
                await _publish(packagePath, carts.manifest, { ...options });
            } catch (error) {
                console.error(error);
            }
        }
    }
}

async function _publish(packagePath: string, manifest: Manifest, options: IPublishOptions) {
    // 上传插件
    try {
        let token = options.pat;
        if (!token) {
            console.log(
                'How to get the Access Token: https://github.com/huaweicloud/cloudide-plugin-packager/tree/codearts'
            );
            const prompt = inquirer.createPromptModule();
            const ans = await prompt([
                { type: 'password', name: 'personal-token', message: 'Enter Your Access Token :', mask: '*' }
            ]);
            if (ans['personal-token']) {
                token = ans['personal-token'];
            } else {
                console.error('\x1B[41m ERROR \x1B[0m The input cannot be empty.');
                return;
            }
        }
        const result = await uploadStream(packagePath, manifest, token);
        const task_id = result.result;
        console.log('✔️  Upload completed!');

        // 查询插件状态
        let extensionStatus: Status;
        try {
            console.log('Checking file status...');
            extensionStatus = await checkExtensionStatus(token, task_id);
            console.log('✔️  Extension status is successful, start publishing!');
        } catch (error) {
            if ((error as Status).status) {
                for (const err of (error as Status).errors) {
                    console.error(`\x1B[41m ERROR \x1B[0m ${err.message}`);
                }
            } else if ((error as AxiosError<StatusResponseError>).response) {
                console.error(
                    `\x1B[41m ERROR \x1B[0m ${(error as AxiosError<StatusResponseError>).response?.data.error_msg}`
                );
            } else {
                console.error('\x1B[41m ERROR \x1B[0m Check extension status error.');
            }
            return;
        }

        // 发布插件
        if (extensionStatus.status === Code.success) {
            const pubResult = await ApiService.getInstance().publishExtension(
                `v1/marketplace/extension/${task_id}/archiving`,
                { type: 0 },
                { headers: { 'x-publisher-token': token } }
            );
            if (pubResult.data.status === Code.success) {
                console.log('✔️  Publish completed! Open Marketplace(https://marketplace.ide.huaweicloud.com).');
            } else {
                console.error(
                    '\x1B[41m ERROR \x1B[0m Extension publish failed, please check your package, then try again.'
                );
            }
        }
    } catch (error) {
        if ((error as AxiosError<StatusResponseError>).response) {
            const data = (error as AxiosError<StatusResponseError>).response?.data;
            if (!data) {
                console.error('\x1B[41m ERROR \x1B[0m Upload request failed, please try again.');
                return;
            }
            if (!data.error_code) {
                console.error(`\x1B[41m ERROR \x1B[0m ${data}`);
                return;
            }
            if (data.error_code === 'IDE.07000043') {
                console.error('\x1B[41m ERROR \x1B[0m Access Token is invalid!');
            } else {
                console.error(`\x1B[41m ERROR \x1B[0m ${data.error_msg}`);
            }
        } else {
            console.error('\x1B[41m ERROR \x1B[0m Upload request failed, please try again.');
        }
    }
}

function checkResponseStatus(data: StatusResponse): boolean {
    if (!data.status || !data.result || data.status !== Code.success) {
        return false;
    }

    if (
        data.result.basicInformation.status === Code.success &&
        data.result.file.status === Code.success &&
        data.result.security.status === Code.success
    ) {
        return true;
    } else {
        return false;
    }
}

async function checkExtensionStatus(token: string, taskId: string): Promise<Status> {
    return new Promise((resolve, reject) => {
        let count = 0;
        const MAXCOUNT = 20;

        const check = async () => {
            try {
                const result = await ApiService.getInstance().getStatus(`v1/marketplace/extension/${taskId}/status`, {
                    headers: { 'x-publisher-token': token }
                });
                count++;
                if (count >= MAXCOUNT && !checkResponseStatus(result.data)) {
                    if (result.data.error_code) {
                        return reject({
                            status: Code.fail,
                            errors: [
                                {
                                    code: Code.fail,
                                    message: result.data.error_msg
                                }
                            ]
                        });
                    } else {
                        const res = Object.values(result.data.result!);
                        return reject({
                            status: Code.fail,
                            errors: res.reduce((init, item) => init.concat(item.errors), [] as StatusFailure[])
                        });
                    }
                }
                if (checkResponseStatus(result.data)) {
                    return resolve({ status: Code.success, errors: [] });
                } else {
                    setTimeout(() => {
                        check();
                    }, 1500);
                }
            } catch (error) {
                reject(error);
            }
        };
        check();
    });
}
