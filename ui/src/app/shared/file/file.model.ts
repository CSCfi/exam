export interface FileResult {
    name: string;
    size: number;
    type: string;
    url?: string;
    content?: string;
}

export interface FileUploadResult {
    success: boolean;
    file?: FileResult;
    error?: string;
}
