// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, SlicePipe } from '@angular/common';
import type { OnChanges, OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Option } from './select.model';

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
        <div ngbDropdownMenu class="xm-scrollable-menu" role="menu" aria-labelledby="dd1">
            @if (!noSearch) {
                <div class="input-group" ngbDropdownItem>
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
