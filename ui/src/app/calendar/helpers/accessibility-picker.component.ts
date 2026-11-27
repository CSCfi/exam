// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, input, output, signal } from '@angular/core';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { FilterableAccessibility } from 'src/app/calendar/calendar.model';

@Component({
    selector: 'xm-calendar-accessibility-picker',
    template: `
        <div class="xm-stack xm-gap-2">
            @if (!disabled()) {
                <button
                    class="btn btn-outline-secondary accs-toggle"
                    (click)="showMenu.set(!showMenu())"
                    (keydown.enter)="showMenu.set(!showMenu())"
                    [ariaExpanded]="showMenu()"
                >
                    {{ 'i18n_calendar_room_accessibility_info' | translate }}
                    @if (!showMenu()) {
                        <i class="bi bi-chevron-right"></i>
                    } @else {
                        <i class="bi bi-chevron-down"></i>
                    }
                </button>
            } @else {
                <p class="xm-text-muted">{{ 'i18n_calendar_room_accessibility_info' | translate }}</p>
            }
            <div [ngbCollapse]="!showMenu()">
                <div class="accs-group xm-stack xm-gap-1" role="group" aria-labelledby="accs-title">
                    <p id="accs-title">{{ 'i18n_exam_room_accessibility' | translate }}</p>
                    @for (item of items(); track item.id) {
                        <label class="accs-item">
                            <input
                                type="checkbox"
                                (click)="item.filtered = !item.filtered; select()"
                                value="{{ item.name }}"
                            />
                            <span>{{ item.name }}</span>
                        </label>
                    }
                </div>
            </div>
        </div>
    `,
    styles: `
        /* A stack stretches its children; keep the button as wide as its text */
        .accs-toggle {
            align-self: start;
        }
        .accs-group {
            margin-inline-start: var(--xm-space-3);
        }
        /* Checkbox stays beside its name; long names wrap, even without spaces */
        .accs-item {
            display: flex;
            align-items: baseline;
            gap: var(--xm-space-1);

            > span {
                min-width: 0;
                overflow-wrap: anywhere;
            }
        }
    `,
    imports: [NgbCollapse, TranslateModule],
})
export class AccessibilityPickerComponent {
    readonly items = input<FilterableAccessibility[]>([]);
    readonly disabled = input(false);
    readonly itemsChange = output<FilterableAccessibility[]>();

    readonly showMenu = signal(false);

    select() {
        this.itemsChange.emit(this.items());
    }
}
