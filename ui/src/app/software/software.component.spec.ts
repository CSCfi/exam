// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SoftwareComponent } from './software.component';
import { SoftwareService } from './software.service';

@Component({
    selector: 'xm-order-by',
    template: '',
    standalone: true,
})
class MockOrderByComponent {}

describe('SoftwareComponent', () => {
    let component: SoftwareComponent;
    let fixture: ComponentFixture<SoftwareComponent>;
    let softwareServiceSpy: jasmine.SpyObj<SoftwareService>;
    let translateServiceSpy: jasmine.SpyObj<TranslateService>;

    const mockSoftware = [
        { id: 1, name: 'Software 1', turnedOn: true },
        { id: 2, name: 'Software 2', turnedOn: false },
    ];

    beforeEach(async () => {
        softwareServiceSpy = jasmine.createSpyObj('SoftwareService', [
            'listSoftware$',
            'updateSoftware$',
            'addSoftware$',
            'removeSoftware$',
        ]);
        translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant']);
        translateServiceSpy.instant.and.returnValue('translated text');

        softwareServiceSpy.listSoftware$.and.returnValue(of(mockSoftware));
        softwareServiceSpy.updateSoftware$.and.returnValue(of(void 0));
        softwareServiceSpy.addSoftware$.and.returnValue(of({ id: 3, name: 'New Software', turnedOn: true }));
        softwareServiceSpy.removeSoftware$.and.returnValue(of(void 0));

        await TestBed.configureTestingModule({
            imports: [SoftwareComponent, FormsModule, MockOrderByComponent],
            providers: [
                { provide: SoftwareService, useValue: softwareServiceSpy },
                { provide: TranslateService, useValue: translateServiceSpy },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(SoftwareComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should initialize with software list', fakeAsync(() => {
            component.ngOnInit();
            tick();

            expect(softwareServiceSpy.listSoftware$).toHaveBeenCalled();
            expect(component.software.length).toBe(2);
            expect(component.software[0].showName).toBeFalse();
        }));

        it('should handle empty software list', fakeAsync(() => {
            softwareServiceSpy.listSoftware$.and.returnValue(of([]));
            component.ngOnInit();
            tick();

            expect(component.software.length).toBe(0);
        }));

        it('should handle error during initialization', fakeAsync(() => {
            softwareServiceSpy.listSoftware$.and.returnValue(throwError(() => new Error('Network error')));
            component.ngOnInit();
            tick();

            expect(component.software.length).toBe(0);
        }));
    });

    describe('Software Updates', () => {
        it('should update software', fakeAsync(() => {
            const softwareToUpdate = { ...mockSoftware[0] };
            component.updateSoftware(softwareToUpdate);
            tick();

            expect(softwareServiceSpy.updateSoftware$).toHaveBeenCalledWith(softwareToUpdate);
        }));

        it('should handle error during software update', fakeAsync(() => {
            const softwareToUpdate = { ...mockSoftware[0] };
            softwareServiceSpy.updateSoftware$.and.returnValue(throwError(() => new Error('Update failed')));

            component.updateSoftware(softwareToUpdate);
            tick();

            expect(softwareServiceSpy.updateSoftware$).toHaveBeenCalledWith(softwareToUpdate);
        }));

        it('should not update software with empty name', fakeAsync(() => {
            const invalidSoftware = { ...mockSoftware[0], name: '' };
            component.updateSoftware(invalidSoftware);
            tick();

            expect(softwareServiceSpy.updateSoftware$).toHaveBeenCalledWith(invalidSoftware);
        }));
    });

    describe('Adding Software', () => {
        beforeEach(() => {
            component.software = [...mockSoftware.map((s) => ({ ...s, showName: false }))];
        });

        it('should add new software', fakeAsync(() => {
            component.newSoftware.name = 'New Software';
            component.addSoftware();
            tick();

            expect(softwareServiceSpy.addSoftware$).toHaveBeenCalledWith('New Software');
            expect(component.software.length).toBe(3);
            expect(component.newSoftware.name).toBe('');
        }));

        it('should not add software with empty name', fakeAsync(() => {
            component.newSoftware.name = '';
            component.addSoftware();
            tick();

            expect(softwareServiceSpy.addSoftware$).not.toHaveBeenCalled();
            expect(component.software.length).toBe(2);
        }));

        it('should handle error when adding software', fakeAsync(() => {
            softwareServiceSpy.addSoftware$.and.returnValue(throwError(() => new Error('Add failed')));
            component.newSoftware.name = 'New Software';
            component.addSoftware();
            tick();

            expect(softwareServiceSpy.addSoftware$).toHaveBeenCalledWith('New Software');
            expect(component.software.length).toBe(2);
            expect(component.newSoftware.name).toBe('New Software');
        }));

        it('should trim whitespace from software name', fakeAsync(() => {
            component.newSoftware.name = '  New Software  ';
            component.addSoftware();
            tick();

            expect(softwareServiceSpy.addSoftware$).toHaveBeenCalledWith('New Software');
        }));
    });

    describe('Removing Software', () => {
        beforeEach(() => {
            component.software = [...mockSoftware.map((s) => ({ ...s, showName: false }))];
        });

        it('should remove software', fakeAsync(() => {
            const softwareToRemove = { ...mockSoftware[0], showName: false };
            component.removeSoftware(softwareToRemove);
            tick();

            expect(softwareServiceSpy.removeSoftware$).toHaveBeenCalledWith(softwareToRemove);
            expect(component.software.length).toBe(2);
        }));

        it('should handle error when removing software', fakeAsync(() => {
            const softwareToRemove = { ...mockSoftware[0], showName: false };
            softwareServiceSpy.removeSoftware$.and.returnValue(throwError(() => new Error('Remove failed')));

            component.removeSoftware(softwareToRemove);
            tick();

            expect(softwareServiceSpy.removeSoftware$).toHaveBeenCalledWith(softwareToRemove);
            expect(component.software.length).toBe(2);
        }));

        it('should not remove software if not found in list', fakeAsync(() => {
            const nonExistentSoftware = { id: 999, name: 'Non-existent', turnedOn: false, showName: false };
            component.removeSoftware(nonExistentSoftware);
            tick();

            expect(softwareServiceSpy.removeSoftware$).toHaveBeenCalledWith(nonExistentSoftware);
            expect(component.software.length).toBe(2);
        }));
    });
});
