// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { Software } from 'src/app/facility/facility.model';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';
import { SoftwareService } from './software.service';

describe('SoftwareService', () => {
    let service: SoftwareService;
    let httpClientSpy: jasmine.SpyObj<HttpClient>;
    let errorHandlerSpy: jasmine.SpyObj<ErrorHandlingService>;
    let toastSpy: jasmine.SpyObj<ToastrService>;
    let translateSpy: jasmine.SpyObj<TranslateService>;

    const mockSoftware: Software = {
        id: 1,
        name: 'Test Software',
        turnedOn: true,
    };

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'put', 'post', 'delete']);
        errorHandlerSpy = jasmine.createSpyObj('ErrorHandlingService', ['handle']);
        toastSpy = jasmine.createSpyObj('ToastrService', ['info']);
        translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);

        TestBed.configureTestingModule({
            providers: [
                SoftwareService,
                { provide: HttpClient, useValue: httpClientSpy },
                { provide: ErrorHandlingService, useValue: errorHandlerSpy },
                { provide: ToastrService, useValue: toastSpy },
                { provide: TranslateService, useValue: translateSpy },
            ],
        });

        service = TestBed.inject(SoftwareService);
        translateSpy.instant.and.returnValue('translated message');
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('listSoftware$', () => {
        it('should return software list on success', (done) => {
            const mockResponse = [mockSoftware];
            httpClientSpy.get.and.returnValue(of(mockResponse));

            service.listSoftware$().subscribe({
                next: (result) => {
                    expect(result).toEqual(mockResponse);
                    expect(httpClientSpy.get).toHaveBeenCalledWith('/app/softwares');
                    done();
                },
            });
        });

        it('should handle error', (done) => {
            const error = new Error('Test error');
            httpClientSpy.get.and.returnValue(throwError(() => error));
            errorHandlerSpy.handle.and.returnValue(throwError(() => error));

            service.listSoftware$().subscribe({
                error: (err) => {
                    expect(err).toBe(error);
                    expect(errorHandlerSpy.handle).toHaveBeenCalledWith(error, 'SoftwareService.listSoftware$');
                    done();
                },
            });
        });
    });

    describe('updateSoftware$', () => {
        it('should update software and show toast on success', (done) => {
            httpClientSpy.put.and.returnValue(of(void 0));

            service.updateSoftware$(mockSoftware).subscribe({
                next: () => {
                    expect(httpClientSpy.put).toHaveBeenCalledWith(
                        `/app/softwares/${mockSoftware.id}/${mockSoftware.name}`,
                        {},
                    );
                    expect(toastSpy.info).toHaveBeenCalledWith('translated message');
                    done();
                },
            });
        });

        it('should handle error', (done) => {
            const error = new Error('Test error');
            httpClientSpy.put.and.returnValue(throwError(() => error));
            errorHandlerSpy.handle.and.returnValue(throwError(() => error));

            service.updateSoftware$(mockSoftware).subscribe({
                error: (err) => {
                    expect(err).toBe(error);
                    expect(errorHandlerSpy.handle).toHaveBeenCalledWith(error, 'SoftwareService.updateSoftware$');
                    done();
                },
            });
        });
    });

    describe('addSoftware$', () => {
        it('should add software and show toast on success', (done) => {
            httpClientSpy.post.and.returnValue(of(mockSoftware));

            service.addSoftware$('New Software').subscribe({
                next: (result) => {
                    expect(result).toEqual(mockSoftware);
                    expect(httpClientSpy.post).toHaveBeenCalledWith('/app/softwares/New Software', {});
                    expect(toastSpy.info).toHaveBeenCalledWith('translated message');
                    done();
                },
            });
        });

        it('should handle error', (done) => {
            const error = new Error('Test error');
            httpClientSpy.post.and.returnValue(throwError(() => error));
            errorHandlerSpy.handle.and.returnValue(throwError(() => error));

            service.addSoftware$('New Software').subscribe({
                error: (err) => {
                    expect(err).toBe(error);
                    expect(errorHandlerSpy.handle).toHaveBeenCalledWith(error, 'SoftwareService.addSoftware$');
                    done();
                },
            });
        });
    });

    describe('removeSoftware$', () => {
        it('should remove software and show toast on success', (done) => {
            httpClientSpy.delete.and.returnValue(of(void 0));

            service.removeSoftware$(mockSoftware).subscribe({
                next: () => {
                    expect(httpClientSpy.delete).toHaveBeenCalledWith(`/app/softwares/${mockSoftware.id}`);
                    expect(toastSpy.info).toHaveBeenCalledWith('translated message');
                    done();
                },
            });
        });

        it('should handle error', (done) => {
            const error = new Error('Test error');
            httpClientSpy.delete.and.returnValue(throwError(() => error));
            errorHandlerSpy.handle.and.returnValue(throwError(() => error));

            service.removeSoftware$(mockSoftware).subscribe({
                error: (err) => {
                    expect(err).toBe(error);
                    expect(errorHandlerSpy.handle).toHaveBeenCalledWith(error, 'SoftwareService.removeSoftware$');
                    done();
                },
            });
        });
    });
});
