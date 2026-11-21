// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { MachineComponent } from './machine.component';

describe('MachineComponent', () => {
    let component: MachineComponent;
    let fixture: ComponentFixture<MachineComponent>;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), error: vi.fn() };
    const router = { navigate: vi.fn() };
    const dialogs = { open$: vi.fn(() => of(true)) };

    const machine = {
        id: 7,
        name: 'Pegasus 01',
        otherIdentifier: 'A1',
        surveillanceCamera: 'CAM-1',
        videoRecordings: '',
        ipAddress: '10.0.0.1',
        outOfService: true,
        statusComment: 'Broken screen',
        softwareInfo: [{ id: 2, name: 'Firefox' }],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [MachineComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: Router, useValue: router },
                { provide: ConfirmationDialogService, useValue: dialogs },
                { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 7 } } } },
            ],
        });
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(MachineComponent);
        component = fixture.componentInstance;
        http.expectOne('/app/machines/7').flush(machine);
        http.expectOne('/app/softwares').flush([
            { id: 1, name: 'Excel' },
            { id: 2, name: 'Firefox' },
        ]);
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    it('should load the machine into the form', () => {
        expect(component.machineForm.name().value()).toBe('Pegasus 01');
        expect(component.machineForm.statusComment().value()).toBe('Broken screen');
    });

    it('should mark the software the machine has', () => {
        expect(component.software().map((s) => [s.name, s.active])).toEqual([
            ['Excel', false],
            ['Firefox', true],
        ]);
    });

    it('should toggle software as the server answers', () => {
        component.toggleSoftware(component.software()[0]);
        const req = http.expectOne('/app/machine/7/software/1');
        expect(req.request.method).toBe('POST');
        req.flush({ turnedOn: true });

        expect(component.software()[0].active).toBe(true);
    });

    it('should save the form', () => {
        component.machineForm.name().value.set('Pegasus 1');

        component.updateMachine();
        const req = http.expectOne('/app/machines/7');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toMatchObject({
            name: 'Pegasus 1',
            outOfService: true,
            statusComment: 'Broken screen',
        });
        req.flush(machine);

        expect(toast.info).toHaveBeenCalledWith('i18n_machine_updated');
    });

    it('should drop the status comment of a machine back in service', () => {
        component.machineForm.outOfService().value.set(false);
        component.setReason();

        component.updateMachine();
        const req = http.expectOne('/app/machines/7');
        expect(req.request.body.outOfService).toBe(false);
        expect(req.request.body.statusComment).toBeUndefined();
        req.flush(machine);
    });

    it('should return to the rooms after saving and exiting', () => {
        component.updateMachineAndExit();
        http.expectOne('/app/machines/7').flush(machine);

        expect(router.navigate).toHaveBeenCalledWith(['staff/rooms']);
    });

    it('should show why removing failed', () => {
        component.removeMachine(component.machine()!);
        http.expectOne('/app/machines/7').flush('Machine removal is not allowed', {
            status: 403,
            statusText: 'Forbidden',
        });

        expect(toast.error).toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
    });
});
