// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { vi } from 'vitest';
import { FileService } from './file.service';

describe('FileService', () => {
    let service: FileService;
    let httpMock: HttpTestingController;
    let toastService: {
        error: ReturnType<typeof vi.fn>;
        success: ReturnType<typeof vi.fn>;
        warning: ReturnType<typeof vi.fn>;
    };
    let translateService: { instant: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        const toastSpy = {
            error: vi.fn(),
            success: vi.fn(),
            warning: vi.fn(),
        };
        const translateSpy = {
            instant: vi.fn((key: string) => key),
        };

        TestBed.configureTestingModule({
            providers: [
                FileService,
                { provide: ToastrService, useValue: toastSpy },
                { provide: TranslateService, useValue: translateSpy },
                provideHttpClient(),
                provideHttpClientTesting(),
                provideZonelessChangeDetection(),
            ],
        });

        service = TestBed.inject(FileService);
        httpMock = TestBed.inject(HttpTestingController);
        toastService = toastSpy;
        translateService = translateSpy;
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('download', () => {
        let createObjectURL: ReturnType<typeof vi.fn>;
        let revokeObjectURL: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            createObjectURL = vi.fn(() => 'blob:mock-url');
            revokeObjectURL = vi.fn();
            vi.stubGlobal('URL', {
                createObjectURL,
                revokeObjectURL,
            });
            vi.spyOn(console, 'log').mockImplementation(() => {});
            const realCreateElement = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
                const el = realCreateElement(tagName);
                if (tagName.toLowerCase() === 'a') {
                    (el as HTMLAnchorElement).click = vi.fn();
                }
                return el;
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
            vi.unstubAllGlobals();
        });

        it('should download file using GET method', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';
            const params = { id: '123' };
            const mockData = btoa('test file content');

            service.download(url, filename, { params });

            const req = httpMock.expectOne((request) => request.url === url && request.method === 'GET');
            expect(req.request.params.get('id')).toBe('123');

            req.flush(new Blob([mockData]), {
                headers: { 'Content-Type': 'application/pdf; charset=utf-8' },
            });

            expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        });

        it('should download file using POST method', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';
            const params = { id: '123' };
            const mockData = btoa('test file content');

            service.download(url, filename, { params, method: 'POST' });

            const req = httpMock.expectOne((request) => request.url === url && request.method === 'POST');
            expect(req.request.body).toEqual({ params });

            req.flush(new Blob([mockData]), {
                headers: { 'Content-Type': 'application/pdf' },
            });

            expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        });

        it('should handle download error', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';

            service.download(url, filename);

            const req = httpMock.expectOne(url);
            req.flush(new Blob(['Error message']), { status: 500, statusText: 'Server Error' });

            expect(toastService.error).toHaveBeenCalled();
        });

        it('should handle missing response body', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';

            service.download(url, filename);

            const req = httpMock.expectOne(url);
            req.flush(null);

            expect(toastService.error).not.toHaveBeenCalled();
        });

        it('should handle missing Content-Type header', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';
            const mockData = btoa('test file content');

            service.download(url, filename);

            const req = httpMock.expectOne(url);
            req.flush(new Blob([mockData]));

            expect(toastService.error).not.toHaveBeenCalled();
            expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        });
    });

    describe('getMaxFilesize$', () => {
        it('should fetch max filesize from API', async () => {
            const mockSize = { filesize: 10485760 };

            const resultPromise = firstValueFrom(service.getMaxFilesize$());
            const req = httpMock.expectOne('/app/settings/maxfilesize');
            expect(req.request.method).toBe('GET');
            req.flush(mockSize);

            const result = await resultPromise;
            expect(result).toEqual(mockSize);
            expect(service.maxFileSize).toBe(10485760);
        });

        it('should return cached value on subsequent calls', async () => {
            service.maxFileSize = 10485760;

            const result = await firstValueFrom(service.getMaxFilesize$());
            expect(result).toEqual({ filesize: 10485760 });
            httpMock.expectNone('/app/settings/maxfilesize');
        });

        it('should cache filesize after first fetch', async () => {
            const mockSize = { filesize: 5242880 };

            const firstResultPromise = firstValueFrom(service.getMaxFilesize$());
            const req = httpMock.expectOne('/app/settings/maxfilesize');
            req.flush(mockSize);
            await firstResultPromise;

            expect(service.maxFileSize).toBe(5242880);

            const secondResult = await firstValueFrom(service.getMaxFilesize$());
            expect(secondResult).toEqual({ filesize: 5242880 });
            httpMock.expectNone('/app/settings/maxfilesize');
        });
    });

    describe('upload', () => {
        it('should upload file successfully', async () => {
            const url = '/api/files/upload';
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const params = { examId: '123' };
            const mockResponse = { id: 456, filename: 'test.txt' };

            service.maxFileSize = 10485760;

            const resultPromise = firstValueFrom(service.upload$(url, file, params));
            const req = httpMock.expectOne(url);
            expect(req.request.method).toBe('POST');
            expect(req.request.body instanceof FormData).toBe(true);
            req.flush(mockResponse);

            const result = await resultPromise;
            expect(result).toEqual(mockResponse);
        });

        it('should reject upload if file is too large', async () => {
            const url = '/api/files/upload';
            const file = new File(['x'.repeat(2000000)], 'large.txt', { type: 'text/plain' });
            const params = { examId: '123' };

            service.maxFileSize = 1000000;

            await expect(firstValueFrom(service.upload$(url, file, params))).rejects.toBeDefined();
            expect(toastService.error).toHaveBeenCalledWith('i18n_file_too_large');
            expect(translateService.instant).toHaveBeenCalledWith('i18n_file_too_large');
            httpMock.expectNone(url);
        });

        it('should handle upload error', async () => {
            const url = '/api/files/upload';
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const params = { examId: '123' };

            service.maxFileSize = 10485760;

            const resultPromise = firstValueFrom(service.upload$(url, file, params));
            const req = httpMock.expectOne(url);
            req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

            await expect(resultPromise).rejects.toMatchObject({ status: 500 });
        });
    });

    describe('uploadAnswerAttachment', () => {
        it('should upload attachment and update parent with EssayAnswer response', async () => {
            const url = '/api/answers/attachment';
            const file = new File(['test content'], 'answer.txt', { type: 'text/plain' });
            const params = { answerId: '789' };
            const parent: { objectVersion?: number; attachment?: Attachment } = { objectVersion: 1 };
            const mockResponse = {
                objectVersion: 2,
                attachment: { id: 123, fileName: 'answer.txt' },
            };

            service.maxFileSize = 10485760;

            service.uploadAnswerAttachment(url, file, params, parent);

            const req = httpMock.expectOne(url);
            req.flush(mockResponse);

            // Wait for async completion - uploadAnswerAttachment uses subscribe internally
            await new Promise<void>((resolve) => setTimeout(resolve, 0));

            expect(parent.objectVersion).toBe(2);
            expect(parent.attachment).toEqual(expect.objectContaining({ id: 123, fileName: 'answer.txt' }));
        });

        it('should upload attachment and update parent with Attachment response', async () => {
            const url = '/api/answers/attachment';
            const file = new File(['test content'], 'answer.txt', { type: 'text/plain' });
            const params = { answerId: '789' };
            const parent: { objectVersion?: number; attachment?: Attachment } = { objectVersion: 1 };
            const mockResponse = { id: 123, fileName: 'answer.txt' };

            service.maxFileSize = 10485760;

            service.uploadAnswerAttachment(url, file, params, parent);

            const req = httpMock.expectOne(url);
            req.flush(mockResponse);

            await new Promise<void>((resolve) => setTimeout(resolve, 0));

            expect(parent.attachment).toEqual(expect.objectContaining({ id: 123, fileName: 'answer.txt' }));
        });

        it('should handle upload error', async () => {
            const url = '/api/answers/attachment';
            const file = new File(['test content'], 'answer.txt', { type: 'text/plain' });
            const params = { answerId: '789' };
            const parent: { objectVersion?: number; attachment?: Attachment } = { objectVersion: 1 };

            service.maxFileSize = 10485760;
            service.uploadAnswerAttachment(url, file, params, parent);

            const req = httpMock.expectOne(url);
            req.flush({ data: 'i18n_error_upload' }, { status: 400, statusText: 'Bad Request' });

            await new Promise<void>((resolve) => setTimeout(resolve, 0));

            expect(toastService.error).toHaveBeenCalledWith('i18n_error_upload');
            expect(translateService.instant).toHaveBeenCalledWith('i18n_error_upload');
        });
    });
});
