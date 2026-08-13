// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { vi } from 'vitest';
import { hasUnsavedChangesGuard, type CanComponentDeactivate } from './has-unsaved-changes.guard';

describe('hasUnsavedChangesGuard', () => {
    let mockDialog: { open$: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockDialog = { open$: vi.fn() };
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [{ provide: ConfirmationDialogService, useValue: mockDialog }],
        });
    });

    const runGuard = (component: CanComponentDeactivate | null) =>
        TestBed.runInInjectionContext(() =>
            hasUnsavedChangesGuard(component as CanComponentDeactivate, null!, null!, null!),
        ) as Observable<boolean>;

    it('should allow navigation when component is null', async () => {
        const result = await firstValueFrom(runGuard(null));
        expect(result).toBe(true);
    });

    it('should allow navigation when component has no canDeactivate method', async () => {
        const result = await firstValueFrom(runGuard({} as CanComponentDeactivate));
        expect(result).toBe(true);
    });

    it('should allow navigation when canDeactivate returns true (no unsaved changes)', async () => {
        const component: CanComponentDeactivate = { canDeactivate: () => true };
        const result = await firstValueFrom(runGuard(component));
        expect(result).toBe(true);
        expect(mockDialog.open$).not.toHaveBeenCalled();
    });

    it('should open a confirmation dialog when canDeactivate returns false', async () => {
        mockDialog.open$.mockReturnValue(of(true));
        const component: CanComponentDeactivate = { canDeactivate: () => false };
        await firstValueFrom(runGuard(component));
        expect(mockDialog.open$).toHaveBeenCalledOnce();
    });

    it('should block navigation when the user cancels the confirmation dialog', async () => {
        mockDialog.open$.mockReturnValue(of(false));
        const component: CanComponentDeactivate = { canDeactivate: () => false };
        const result = await firstValueFrom(runGuard(component));
        expect(result).toBe(false);
    });

    it('should allow navigation when the user confirms the confirmation dialog', async () => {
        mockDialog.open$.mockReturnValue(of(true));
        const component: CanComponentDeactivate = { canDeactivate: () => false };
        const result = await firstValueFrom(runGuard(component));
        expect(result).toBe(true);
    });
});
