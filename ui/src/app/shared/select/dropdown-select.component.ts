/*
 *
 *  * Copyright (c) 2018 Exam Consortium
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */
import { NgClass, SlicePipe } from '@angular/common';
import type { OnChanges, OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

export interface Option<V, I> {
    value?: V;
    id?: I;
    label: string | null;
    isHeader?: boolean;
}

@Component({
    selector: 'xm-dropdown-select',
    template: `<div ngbDropdown #d="ngbDropdown" autoClose="outside">
        <button
            ngbDropdownToggle
            class="btn btn-outline-secondary"
            [ngClass]="{ 'dropdown-select-full-width': fullWidth }"
            type="button"
            aria-haspopup="true"
            aria-expanded="true"
            id="dd1"
        >
            {{ selected?.label || placeholder | translate }}
        </button>
        <div ngbDropdownMenu class="scrollable-menu" role="menu" aria-labelledby="dd1">
            @if (!noSearch) {
                <button ngbDropdownItem>
                    <div class="input-group">
                        <input
                            [(ngModel)]="searchFilter"
                            class="form-control"
                            (input)="filterOptions()"
                            placeholder="{{ placeholder | translate }}"
                        />
                        <div class="input-group-append">
                            <span class="input-group-text">
                                <i class="bi-search"></i>
                            </span>
                        </div>
                    </div>
                </button>
            }
            <button ngbDropdownItem (click)="clearSelection(); d.close()">
                <i class="bi-x text text-danger"></i>
            </button>
            @for (opt of filteredOptions; track $index) {
                <button ngbDropdownItem [ngClass]="getClasses(opt)" (click)="selectOption(opt); d.close()">
                    @if (!opt.isHeader) {
                        <span>
                            {{ opt.label || '' | translate | slice: 0 : 40 }}
                        </span>
                    }
                    @if (opt.isHeader) {
                        <span>{{ opt.label }}</span>
                    }
                </button>
            }
        </div>
    </div>`,
    standalone: true,
    imports: [
        NgbDropdown,
        NgbDropdownToggle,
        NgClass,
        NgbDropdownMenu,
        FormsModule,
        NgbDropdownItem,
        SlicePipe,
        TranslateModule,
    ],
    styleUrl: './dropdown-select.component.scss',
})
export class DropdownSelectComponent<V, I> implements OnInit, OnChanges {
    @Input() options: Option<V, I>[] = []; // everything
    @Input() placeholder = 'i18n_choose';
    @Input() limitTo?: number;
    @Input() fullWidth = false;
    @Input() noSearch = false;
    @Output() optionSelected = new EventEmitter<Option<V, I> | undefined>();
    filteredOptions: Option<V, I>[] = []; // filtered
    searchFilter = '';
    selected?: Option<V, I>;

    ngOnInit() {
        this.filterOptions();
    }

    ngOnChanges() {
        this.filterOptions();
    }

    labelFilter = (option: Option<V, I>): boolean =>
        option.label != null && option.label.toLowerCase().includes(this.searchFilter.toLowerCase());

    filterOptions = () => {
        // Show all options, if limit is set to 0
        if (!this.limitTo || this.limitTo === 0) {
            this.filteredOptions = this.options.filter(this.labelFilter);
        } else {
            this.filteredOptions = this.options.filter(this.labelFilter).slice(0, this.limitTo);
        }
    };

    selectOption = (option: Option<V, I>) => {
        this.selected = option;
        this.optionSelected.emit(option);
    };

    getClasses = (option: Option<V, I>): string[] => {
        const classes: string[] = [];
        if (this.selected && this.selected.id === option.id) {
            classes.push('active');
        }
        if (option.isHeader) {
            classes.push('dropdown-header');
        }
        return classes;
    };

    clearSelection = () => {
        delete this.selected;
        this.optionSelected.emit();
    };
}
