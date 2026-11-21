// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { MachineListComponent } from './machines.component';

describe('MachineListComponent', () => {
    let component: MachineListComponent;
    let fixture: ComponentFixture<MachineListComponent>;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), error: vi.fn() };

    const room = () =>
        ({
            id: 3,
            examMachines: [
                { id: 2, name: 'Pegasus 02', outOfService: false, statusComment: 'Slow' },
                { id: 1, name: 'Pegasus 01', outOfService: true },
                { id: 3, name: 'Pegasus 03', outOfService: false },
            ],
        }) as unknown as ExamRoom;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [MachineListComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                provideRouter([]),
                { provide: ToastService, useValue: toast },
            ],
        });
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(MachineListComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('room', room());
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    it('should sort the machines by name', () => {
        expect(component.machines().map((m) => m.id)).toEqual([1, 2, 3]);
    });

    it('should count the machines out of service and those with a notice', () => {
        expect(component.countMachineAlerts()).toBe(1);
        expect(component.countMachineNotices()).toBe(1);
    });

    it('should add a machine to the room', () => {
        component.addNewMachine();
        const req = http.expectOne('/app/machines/3');
        expect(req.request.method).toBe('POST');
        req.flush({ id: 4, name: 'Pegasus 00' });

        expect(component.machines().map((m) => m.id)).toEqual([4, 1, 2, 3]);
        expect(toast.info).toHaveBeenCalledWith('i18n_machine_added');
    });

    it('should show why adding a machine failed', () => {
        component.addNewMachine();
        http.expectOne('/app/machines/3').flush('i18n_error_access_forbidden', {
            status: 403,
            statusText: 'Forbidden',
        });

        expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
    });
});
