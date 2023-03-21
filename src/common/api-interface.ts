export interface RequestHeader {
    'x-publisher-token': string;
    [key: string]: string;
}

export interface UploadForm {
    file: any;
    chunkIndex: number;
    merge: string;
    totalChunkNum: number;
    parentFileSize: number;
    override: string;
    chunkMd5: string;
    parentFileSha256: string;
    parentFileName: string;
    taskId?: string;
}

export interface UploadFileParams {
    headers: RequestHeader;
}

export interface UploadFileResponse {
    result: string;
    status: string;
}

export interface StatusFailure {
    code: string;
    message: string;
}

export interface Status {
    status: string;
    errors: StatusFailure[];
}

interface PublisherSnake {
    publisher_id: string;
    publisher_name: string;
    display_name: string;
}

interface ExtensionInfo {
    publisherSnake: PublisherSnake;
    identifier: string;
    logUrl: string;
    displayName: string;
    platform: string;
    version: string;
    description: string;
}

interface StatusInfomation {
    status: string;
    errors: StatusFailure[];
    extension_version_compare: string;
    extension_brief_info: ExtensionInfo;
}

export enum Code {
    success = 'success',
    fail = 'failed'
}

export interface StatusResponse {
    result?: {
        security: Status;
        file: Status;
        basicInformation: StatusInfomation;
    };
    status?: Code;
    error_code?: string;
    error_msg?: string;
}

export interface StatusResponseError {
    error_code: string;
    error_msg: string;
}

export interface StatusParams {
    headers: RequestHeader;
}

interface PublishResult {
    extensionId: string;
    firstUpload: boolean;
}

export interface PublishResponse {
    result: PublishResult;
    status: string;
}

enum PublishType {
    gray = 0,
    online = 1
}

export interface PublishBody {
    type: PublishType;
}

export interface PublishParams {
    headers: RequestHeader;
}
