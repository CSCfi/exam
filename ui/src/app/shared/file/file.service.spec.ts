// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
        /**
         * NOTE: These two tests are skipped due to jsdom limitations with URL.createObjectURL.
         *
         * The download method uses file-saver-es which internally calls URL.createObjectURL
         * when a successful response with Content-Type is received. jsdom doesn't support this
         * API, causing unhandled errors in async callbacks after tests complete.
         *
         * The download functionality is tested indirectly through integration tests.
         * To re-enable these tests, either:
         * 1. Use a test environment with better File API support (e.g., happy-dom)
         * 2. Properly mock file-saver-es at the module level before bundling
         * 3. Wait for jsdom to implement URL.createObjectURL support
         */
        it.skip('should download file using GET method', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';
            const params = { id: '123' };
            const mockData = btoa('test file content');

            service.download(url, filename, params, false);

            const req = httpMock.expectOne((request) => request.url === url && request.method === 'GET');
            expect(req.request.params.get('id')).toBe('123');

            req.flush(mockData, {
                headers: { 'Content-Type': 'application/pdf; charset=utf-8' },
            });
        });

        it.skip('should download file using POST method', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';
            const params = { id: '123' };
            const mockData = btoa('test file content');

            service.download(url, filename, params, true);

            const req = httpMock.expectOne((request) => request.url === url && request.method === 'POST');
            expect(req.request.body).toEqual({ params });

            req.flush(mockData, {
                headers: { 'Content-Type': 'application/pdf' },
            });
        });

        it('should handle download error', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';

            service.download(url, filename);

            const req = httpMock.expectOne(url);
            req.flush('Error message', { status: 500, statusText: 'Server Error' });

            expect(toastService.error).toHaveBeenCalled();
        });

        it('should handle missing response body', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';

            service.download(url, filename);

            const req = httpMock.expectOne(url);
            req.flush(null);

            // Should not throw error
            expect(toastService.error).not.toHaveBeenCalled();
        });

        it('should handle missing Content-Type header', () => {
            const url = '/api/files/download';
            const filename = 'test.pdf';
            const mockData = btoa('test file content');

            service.download(url, filename);

            const req = httpMock.expectOne(url);
            req.flush(mockData);

            // Should not throw error
            expect(toastService.error).not.toHaveBeenCalled();
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
