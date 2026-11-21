// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { AccessibilityComponent } from './accessibility.component';

describe('AccessibilityComponent', () => {
    let component: AccessibilityComponent;
    let fixture: ComponentFixture<AccessibilityComponent>;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), error: vi.fn() };

    const names = () => component.accessibilities().map((a) => a.name);

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [AccessibilityComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
            ],
        });
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(AccessibilityComponent);
        component = fixture.componentInstance;
        http.expectOne('/app/accessibility').flush([
            { id: 1, name: 'Ramp' },
            { id: 2, name: 'Lift' },
        ]);
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    it('should list the items', () => {
        expect(names()).toEqual(['Ramp', 'Lift']);
    });

    it('should add an item and clear the name', () => {
        component.newItemForm.name().value.set('Hearing loop');

        component.add();
        const req = http.expectOne('/app/accessibility');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ name: 'Hearing loop' });
        req.flush({ id: 3, name: 'Hearing loop' });

        expect(names()).toEqual(['Ramp', 'Lift', 'Hearing loop']);
        expect(component.newItemForm.name().value()).toBe('');
    });

    it('should not add an item without a name', () => {
        component.add();
        http.expectNone('/app/accessibility');
    });

    it('should rename an item by its id', () => {
        const ramp = component.accessibilities()[0];
        component.toggleShowName(ramp);
        component.getEditNameForm(ramp).name().value.set('Wheelchair ramp');

        component.saveAndToggle(component.accessibilities()[0]);
        const req = http.expectOne('/app/accessibility');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toMatchObject({ id: 1, name: 'Wheelchair ramp' });
        req.flush({ id: 1, name: 'Wheelchair ramp' });

        expect(names()).toEqual(['Wheelchair ramp', 'Lift']);
        expect(component.accessibilities()[0].showName).toBe(false);
    });

    it('should remove an item', () => {
        component.remove(component.accessibilities()[1]);
        const req = http.expectOne('/app/accessibility/2');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        expect(names()).toEqual(['Ramp']);
    });
});
