import { NgClass, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Accessibility } from 'src/app/reservation/reservation.model';

type FilterableAccessibility = Accessibility & { filtered: boolean };

@Component({
    selector: 'xm-calendar-accessibility-picker',
    template: `<div class="row mt-2 mb-2">
        <div class="col-md-12 mt-2 mb-2">
            <div class="row">
                <div class="col-md-12">
                    @if (!disabled) {
                        <button
                            class="btn btn-outline-secondary"
                            (click)="showMenu.set(!showMenu())"
                            (keydown.enter)="showMenu.set(!showMenu())"
                            [attr.aria-expanded]="showMenu()"
                        >
                            {{ 'i18n_calendar_room_accessibility_info' | translate }}
                            @if (!showMenu()) {
                                <i class="bi bi-chevron-right"></i>
                            }
                            @if (showMenu()) {
                                <i class="bi bi-chevron-down"></i>
                            }
                        </button>
                    } @else {
                        <span class="text text-muted">
                            {{ 'i18n_calendar_room_accessibility_info' | translate }}
                        </span>
                    }
                    <div [ngbCollapse]="!showMenu()">
                        <div class="row">
                            <div class="col-md-12">
                                <div class="calendar-accs-title">
                                    {{ 'i18n_exam_room_accessibility' | translate }}
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12 calendar-accs-checkboxes">
                                @for (item of items; track item.id) {
                                    <span class="me-2 accs-list">
                                        <label for="{{ item.name }}">
                                            <input
                                                id="{{ item.name }}"
                                                type="checkbox"
                                                (click)="item.filtered = !item.filtered; select()"
                                                value="{{ item.name }}"
                                            />
                                        </label>
                                        {{ item.name }}
                                    </span>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div> `,
    styleUrls: ['../calendar.component.scss'],
    standalone: true,
    imports: [NgClass, FormsModule, NgbCollapse, UpperCasePipe, TranslateModule],
})
export class AccessibilityPickerComponent {
    @Input() items: FilterableAccessibility[] = [];
    @Input() disabled = false;
    @Output() itemsChange = new EventEmitter<FilterableAccessibility[]>();

    showMenu = signal(false);

    select = () => this.itemsChange.emit(this.items);
}
