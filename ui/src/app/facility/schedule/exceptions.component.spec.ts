// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RoomService } from 'src/app/facility/rooms/room.service';
import type { ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { vi } from 'vitest';
import { ExceptionListComponent } from './exceptions.component';

describe('ExceptionListComponent', () => {
    let component: ExceptionListComponent;
    let fixture: ComponentFixture<ExceptionListComponent>;
    const roomService = { openExceptionDialog: vi.fn() };

    // 08:00 - 16:00 in Tokyo
    const exception = {
        id: 1,
        startDate: '2030-06-11T23:00:00Z',
        endDate: '2030-06-12T07:00:00Z',
        outOfService: false,
    } as ExceptionWorkingHours;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [ExceptionListComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: RoomService, useValue: roomService },
                { provide: ModalService, useValue: {} },
            ],
        });
        TestBed.overrideComponent(ExceptionListComponent, { set: { imports: [], template: '' } });
        fixture = TestBed.createComponent(ExceptionListComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('exceptions', [exception]);
        fixture.componentRef.setInput('timeZone', 'Asia/Tokyo');
    });

    it('should show exception times in room time', () => {
        expect(component.formatDate(exception)).toBe('12.06.2030 08:00 - 16:00');
    });

    it('should have new exceptions entered in room time', () => {
        component.addExceptionOpen();

        expect(roomService.openExceptionDialog).toHaveBeenCalledWith(
            expect.any(Function),
            false,
            [exception],
            'Asia/Tokyo',
        );
    });
});
