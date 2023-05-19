import * as fs from 'fs';
import * as crypto from 'crypto';
import * as FormData from 'form-data';
import * as path from 'path';
import * as inquirer from 'inquirer';
import { RequestHeader, UploadFileParams, UploadFileResponse, UploadForm } from './api-interface';
import { Manifest } from './manifest';
import ApiService from './api';
import ProgressBar from './progress';

// 超过100M的文件分片上传
const MAXSIZE = 100 * 1024 * 1024;
const UNIT = 20 * 1024 * 1024;

export async function uploadStream(filePath: string, manifest: Manifest, token: string): Promise<UploadFileResponse> {
    const info = await fs.promises.stat(filePath);
    const size = info.size;
    const fileName = `${manifest.publisher!.toLowerCase()}.${manifest.name}-${manifest.version}.carts`;
    const fileMD5 = await hashFile(filePath, 'md5');
    const fileSHA256 = await hashFile(filePath, 'sha256');
    if (size > MAXSIZE) {
        const count = Math.ceil(size / UNIT);
        const requests = [];
        const pd = new ProgressBar('UploadProgress', 50);
        // 请求第一片，获取taskId
        const firstRes = await _uploadFirstChunk(filePath, size, fileName, fileSHA256, token, count);
        pd.render({ completed: 1, total: count });
        const taskId = firstRes.result;
        for (let i = 1; i < count; i++) {
            const chunkMD5 = await hashFile(filePath, 'md5', { start: i * UNIT, end: (i + 1) * UNIT - 1 });
            const formParams: UploadForm = {
                file: fs.createReadStream(filePath, {
                    start: i * UNIT,
                    end: (i + 1) * UNIT - 1 // 删除结束结点，此结点会包含在下次切片的开始结点中
                }),
                chunkIndex: i + 1,
                merge: 'false',
                totalChunkNum: count,
                parentFileSize: size,
                override: 'true',
                parentFileName: fileName,
                chunkMd5: chunkMD5,
                parentFileSha256: fileSHA256,
                taskId
            };
            if (i === count - 1) {
                // 最后一个切片不包含end参数，表示当前流已结束
                formParams.file = fs.createReadStream(filePath, {
                    start: i * UNIT
                });

                formParams.merge = 'true';
                formParams.chunkMd5 = await hashFile(filePath, 'md5', { start: i * UNIT });
            }
            const uploadParams = getUploadParams(formParams, token);
            requests.push(() => {
                return ApiService.getInstance().uploadFile('v2/fileservice/file/upload', uploadParams.data, {
                    headers: uploadParams.headers
                });
            });
        }
        const responses = [];
        let progress = 2;
        while (requests.length > 0) {
            const cb = requests.shift()!;
            const result = await cb();
            pd.render({ completed: progress, total: count });
            progress++;
            responses.push(result.data);
        }
        return responses[responses.length - 1];
    } else {
        return await normalFileUpload(filePath, fileName, fileMD5, fileSHA256, token);
    }
}

export async function checkManifest(manifest: Manifest): Promise<boolean> {
    const REQUIRED_KEYS = ['name', 'version', 'publisher', 'engines', 'activationEvents', 'main'];
    for (const key of REQUIRED_KEYS) {
        if (!manifest[key]) {
            console.log(`\x1B[41m ERROR \x1B[0m The ${key} field is missing from the 'package.json' file.`);
            return false;
        }
    }

    return true;
}

function verifyFiles(files: string[]): boolean {
    let result = false;
    const rootFolder = path.resolve(process.cwd());
    for (const file of files) {
        const filePath = path.resolve(rootFolder, file);
        if (fs.existsSync(filePath)) {
            result = true;
            break;
        }
    }

    return result;
}

export async function checkPackageFiles(): Promise<boolean> {
    const readme = ['README.md', 'readme.md'];
    const prompt = inquirer.createPromptModule();

    const hasReadme = verifyFiles(readme);
    if (!hasReadme) {
        const message = 'README.md or readme.md not found. Do you want to continue?';
        const ans = await prompt([
            {
                type: 'confirm',
                name: 'check-readme-result',
                message,
                prefix: '\x1B[43m WARNING \x1B[0m '
            }
        ]);
        if (!ans['check-readme-result']) {
            return false;
        }
    }
    const licenses = ['LICENSE', 'LICENSE.txt', 'LICENSE.md'];
    const hasLicense = verifyFiles(licenses);

    if (!hasLicense) {
        console.warn('\x1B[43m WARNING \x1B[0m LICENSE.md, LICENSE.txt or LICENSE not found.');
    }
    return true;
}

function normalFileUpload(
    filePath: string,
    fileName: string,
    fileMD5: string,
    fileSHA256: string,
    token: string
): Promise<UploadFileResponse> {
    return new Promise((resolve, reject) => {
        const uploadForm: UploadForm = {
            file: fs.createReadStream(filePath),
            chunkIndex: 1,
            merge: 'true',
            totalChunkNum: 1,
            parentFileSize: 10,
            override: 'true',
            parentFileName: fileName,
            chunkMd5: fileMD5,
            parentFileSha256: fileSHA256
        };
        const uploadParams = getUploadParams(uploadForm, token);
        ApiService.getInstance()
            .uploadFile('v2/fileservice/file/upload', uploadParams.data, {
                headers: uploadParams.headers
            })
            .then((res) => {
                resolve(res.data);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

function _uploadFirstChunk(
    filePath: string,
    size: number,
    fileName: string,
    fileSHA256: string,
    token: string,
    totalChunkNum: number
): Promise<UploadFileResponse> {
    return new Promise((resolve, reject) => {
        hashFile(filePath, 'md5', { start: 0, end: UNIT - 1 })
            .then((chunkMD5) => {
                const uploadForm: UploadForm = {
                    file: fs.createReadStream(filePath, {
                        start: 0,
                        end: UNIT - 1
                    }),
                    chunkIndex: 1,
                    merge: 'false',
                    totalChunkNum,
                    parentFileSize: size,
                    override: 'true',
                    parentFileName: fileName,
                    chunkMd5: chunkMD5,
                    parentFileSha256: fileSHA256
                };
                const uploadParams = getUploadParams(uploadForm, token);
                ApiService.getInstance()
                    .uploadFile('v2/fileservice/file/upload', uploadParams.data, {
                        headers: uploadParams.headers
                    })
                    .then((res) => {
                        resolve(res.data);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            })
            .catch((err) => {
                reject(err);
            });
    });
}

export function hashFile(path: string, code = 'md5', option?: { start?: number; end?: number }): Promise<string> {
    return new Promise((resolve, reject) => {
        // 计算文件MD5值 或 sha256值
        const stream = option ? fs.createReadStream(path, option) : fs.createReadStream(path);
        const hash = crypto.createHash(code);
        stream.on('data', (chunk) => {
            hash.update(chunk as string, 'utf8');
        });
        stream.on('end', () => {
            const result = hash.digest('hex');
            resolve(result);
        });
        stream.on('error', (err) => {
            reject(err);
        });
    });
}

export function getUploadParams(params: UploadForm, token: string): { data: FormData; headers: RequestHeader } {
    const formData = new FormData();

    formData.append('file', params.file);
    formData.append('chunk_index', params.chunkIndex);
    formData.append('merge', params.merge);
    formData.append('total_chunk_num', params.totalChunkNum);
    formData.append('parent_file_size', params.parentFileSize);
    formData.append('parent_file_name', params.parentFileName),
        formData.append('override', params.override),
        formData.append('chunk_md5', params.chunkMd5);
    formData.append('parent_file_sha256', params.parentFileSha256);
    if (params.taskId) {
        formData.append('task_id', params.taskId);
    }

    const headers = formData.getHeaders();

    const uploadParams: UploadFileParams = {
        headers: { ...headers, 'x-publisher-token': token }
    };

    return {
        data: formData,
        headers: uploadParams.headers
    };
}

export async function getPackageFiles(
    includeFile: string[],
    excludeFile: string[]
): Promise<{ excludeFiles: string[]; includeFiles: string[]; }> {
    const configPath = path.resolve(process.cwd()) + '/pack-config.json';
    let excludeFiles: string[] = [];
    let includeFiles: string[] = [];
    try {
        if (fs.existsSync(configPath)) {
            fs.accessSync(configPath);
            const configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf-8' }));
            const { exclude, include } = configs;
            excludeFiles = exclude && exclude.length ? excludeFile.concat(exclude) : excludeFile;
            includeFiles = include && include.length ? includeFile.concat(include) : includeFile;
        } else {
            excludeFiles = excludeFile;
            includeFiles = includeFile;
        }
    } catch (err) {
        excludeFiles = excludeFile;
        includeFiles = includeFile;
    }

    const { ignore, negate } = await readVscodeignore(process.cwd());
    excludeFiles = [...excludeFiles, ...ignore];
    includeFiles = [...includeFiles, ...negate];
    return {
        excludeFiles,
        includeFiles
    };
}

function readVscodeignore(cwd: string): Promise<{ ignore: string[]; negate: string[] }> {
    return (
        fs.promises
            .readFile(path.join(cwd, '.vscodeignore'), 'utf8')
            .catch<string>(err =>
                err.code !== 'ENOENT' ? Promise.reject(err) : Promise.resolve('')
            )

            // Parse raw ignore by splitting output into lines and filtering out empty lines and comments
            .then(rawIgnore =>
                rawIgnore
                    .split(/[\n\r]/)
                    .map(s => s.trim())
                    .filter(s => !!s)
                    .filter(i => !/^\s*#/.test(i))
            )

            // Add '/**' to possible folder names
            .then(ignore => [
                ...ignore,
                ...ignore.filter(i => !/(^|\/)[^/]*\*[^/]*$/.test(i)).map(i => (/\/$/.test(i) ? `${i}**` : `${i}/**`)),
            ])

            // Split into ignore and negate list
            .then(ignore =>
                ignore.reduce<[string[], string[]]>(
                    (r, e) => (!/^\s*!/.test(e) ? [[...r[0], e], r[1]] : [r[0], [...r[1], e.substring(1)]]),
                    [[], []]
                )
            )
            .then(r => {
                return ({ ignore: r[0], negate: r[1] });
            })
    );
}
