// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { FileService } from './file.service';

describe('FileService', () => {
    let service: FileService;
    let httpMock: HttpTestingController;
    let toastService: jasmine.SpyObj<ToastrService>;
    let translateService: jasmine.SpyObj<TranslateService>;

    beforeEach(() => {
        const toastSpy = jasmine.createSpyObj('ToastrService', ['error', 'success', 'warning']);
        const translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
        translateSpy.instant.and.callFake((key: string) => key);

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
        toastService = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
        translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('download', () => {
        it('should download file using GET method', () => {
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

        it('should download file using POST method', () => {
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
        it('should fetch max filesize from API', (done) => {
            const mockSize = { filesize: 10485760 };

            service.getMaxFilesize$().subscribe((result) => {
                expect(result).toEqual(mockSize);
                expect(service.maxFileSize).toBe(10485760);
                done();
            });

            const req = httpMock.expectOne('/app/settings/maxfilesize');
            expect(req.request.method).toBe('GET');
            req.flush(mockSize);
        });

        it('should return cached value on subsequent calls', (done) => {
            service.maxFileSize = 10485760;

            service.getMaxFilesize$().subscribe((result) => {
                expect(result).toEqual({ filesize: 10485760 });
                done();
            });

            httpMock.expectNone('/app/settings/maxfilesize');
        });

        it('should cache filesize after first fetch', (done) => {
            const mockSize = { filesize: 5242880 };

            service.getMaxFilesize$().subscribe(() => {
                expect(service.maxFileSize).toBe(5242880);

                service.getMaxFilesize$().subscribe((result) => {
                    expect(result).toEqual({ filesize: 5242880 });
                    done();
                });

                httpMock.expectNone('/app/settings/maxfilesize');
            });

            const req = httpMock.expectOne('/app/settings/maxfilesize');
            req.flush(mockSize);
        });
    });

    describe('upload', () => {
        it('should upload file successfully', async () => {
            const url = '/api/files/upload';
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const params = { examId: '123' };
            const mockResponse = { id: 456, filename: 'test.txt' };

            service.maxFileSize = 10485760;

            service.upload$(url, file, params).subscribe((resp) => expect(resp).toEqual(mockResponse));

            const req = httpMock.expectOne(url);
            expect(req.request.method).toBe('POST');
            expect(req.request.body instanceof FormData).toBe(true);
            req.flush(mockResponse);
        });

        it('should reject upload if file is too large', async () => {
            const url = '/api/files/upload';
            const file = new File(['x'.repeat(2000000)], 'large.txt', { type: 'text/plain' });
            const params = { examId: '123' };

            service.maxFileSize = 1000000;

            service.upload$(url, file, params).subscribe({
                next: () => fail('Should have thrown error'),
                error: () => {
                    expect(toastService.error).toHaveBeenCalledWith('i18n_file_too_large');
                    expect(translateService.instant).toHaveBeenCalledWith('i18n_file_too_large');
                },
            });

            httpMock.expectNone(url);
        });

        it('should handle upload error', (done) => {
            const url = '/api/files/upload';
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const params = { examId: '123' };

            service.maxFileSize = 10485760;

            service.upload$(url, file, params).subscribe({
                next: () => fail('Should have failed with 500 error'),
                error: (err) => {
                    expect(err.status).toBe(500);
                    done();
                },
            });

            const req = httpMock.expectOne(url);
            req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
        });
    });

    describe('uploadAnswerAttachment', () => {
        it('should upload attachment and update parent with EssayAnswer response', (done) => {
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

            // Wait for async completion
            setTimeout(() => {
                expect(parent.objectVersion).toBe(2);
                expect(parent.attachment).toEqual(jasmine.objectContaining({ id: 123, fileName: 'answer.txt' }));
                done();
            }, 0);
        });

        it('should upload attachment and update parent with Attachment response', (done) => {
            const url = '/api/answers/attachment';
            const file = new File(['test content'], 'answer.txt', { type: 'text/plain' });
            const params = { answerId: '789' };
            const parent: { objectVersion?: number; attachment?: Attachment } = { objectVersion: 1 };
            const mockResponse = { id: 123, fileName: 'answer.txt' };

            service.maxFileSize = 10485760;

            service.uploadAnswerAttachment(url, file, params, parent);

            const req = httpMock.expectOne(url);
            req.flush(mockResponse);

            setTimeout(() => {
                expect(parent.attachment).toEqual(jasmine.objectContaining({ id: 123, fileName: 'answer.txt' }));
                done();
            }, 0);
        });

        it('should handle upload error', (done) => {
            const url = '/api/answers/attachment';
            const file = new File(['test content'], 'answer.txt', { type: 'text/plain' });
            const params = { answerId: '789' };
            const parent: { objectVersion?: number; attachment?: Attachment } = { objectVersion: 1 };

            service.maxFileSize = 10485760;
            service.uploadAnswerAttachment(url, file, params, parent);

            const req = httpMock.expectOne(url);
            req.flush({ data: 'i18n_error_upload' }, { status: 400, statusText: 'Bad Request' });

            queueMicrotask(() => {
                expect(toastService.error).toHaveBeenCalledWith('i18n_error_upload');
                expect(translateService.instant).toHaveBeenCalledWith('i18n_error_upload');
                done();
            });
        });
    });
});
