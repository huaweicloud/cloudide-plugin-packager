import axios, { AxiosInstance, AxiosResponse, CreateAxiosDefaults } from 'axios';
import * as FormData from 'form-data';
import { getProxySettings } from 'get-proxy-settings';
import { apiHost } from "../config.json";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HttpsProxyAgent = require('https-proxy-agent');

import {
    PublishBody,
    PublishParams,
    PublishResponse,
    StatusParams,
    StatusResponse,
    UploadFileParams,
    UploadFileResponse
} from './api-interface';

export default class ApiService {
    private static request: AxiosInstance;
    private static instance: ApiService = new ApiService();

    constructor() {
        this.init();
    }

    public static getInstance(): ApiService {
        return ApiService.instance;
    }

    private async init() {
        const proxyConfig = await getProxySettings();
        const axiosOptions: CreateAxiosDefaults = {
            baseURL: apiHost,
            proxy: false
        };
        if (proxyConfig?.http) {
            axiosOptions.httpAgent = new HttpsProxyAgent(proxyConfig.http);
        }
        if (proxyConfig?.https) {
            axiosOptions.httpsAgent = new HttpsProxyAgent(proxyConfig.https);
        }
        ApiService.request = axios.create(axiosOptions);
    }

    public uploadFile(
        url: string,
        data: FormData,
        params: UploadFileParams
    ): Promise<AxiosResponse<UploadFileResponse>> {
        return ApiService.request.post(url, data, params);
    }

    public getStatus(url: string, params: StatusParams): Promise<AxiosResponse<StatusResponse>> {
        return ApiService.request.get(url, params);
    }

    public publishExtension(
        url: string,
        data: PublishBody,
        params: PublishParams
    ): Promise<AxiosResponse<PublishResponse>> {
        return ApiService.request.post(url, data, params);
    }
}
