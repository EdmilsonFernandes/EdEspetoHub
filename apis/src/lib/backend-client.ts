import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { env } from '../config/env';
export class BackendClient {
    private readonly http: AxiosInstance;
    constructor() { this.http = axios.create({ baseURL: env.backendUrl, timeout: 15_000 }); }
    public async get<T>(path: string, token?: string, params?: Record<string, unknown>): Promise<T> { return (await this.http.get<T>(path, this.cfg(token, { params }))).data; }
    public async post<T>(path: string, body: unknown, token?: string): Promise<T> { return (await this.http.post<T>(path, body, this.cfg(token))).data; }
    public async patch<T>(path: string, body: unknown, token?: string): Promise<T> { return (await this.http.patch<T>(path, body, this.cfg(token))).data; }
    public async put<T>(path: string, body: unknown, token?: string): Promise<T> { return (await this.http.put<T>(path, body, this.cfg(token))).data; }
    public async delete<T>(path: string, token?: string): Promise<T> { return (await this.http.delete<T>(path, this.cfg(token))).data; }
    private cfg(token?: string, extra?: AxiosRequestConfig): AxiosRequestConfig { return { ...extra, headers: token ? { Authorization: `Bearer ${token}` } : {} }; }
}
export const backendClient = new BackendClient();
