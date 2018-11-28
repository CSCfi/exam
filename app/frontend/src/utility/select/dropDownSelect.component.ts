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
import * as angular from 'angular';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

interface Selection {
    value: any;
}

export interface Option {
    value?: any;
    id: any | null;
    label: string | null;
    isHeader?: boolean;
}

@Component({
    selector: 'dropdown-select',
    template: require('./dropDownSelect.component.html'),
})
export class DropdownSelectComponent {
    @Input() options: Option[] = [];
    @Input() placeholder = '-';
    @Output() onSelect = new EventEmitter<Selection>();
    searchFilter = '';
    selected: Option;
    labelFilter: (_: Option) => boolean;

    constructor() {
        this.labelFilter = (option: Option): boolean => {
            return option.label != null &&
                option.label.toLowerCase().includes(this.searchFilter.toLowerCase());
        };
    }

    selectOption = (option: Option) => {
        this.selected = option;
        this.onSelect.emit({ value: option.value || option.id });
    }

    getClasses = (option: Option): string[] => {
        const classes: string[] = [];
        if (this.selected && this.selected.id === option.id) {
            classes.push('active');
        }
        if (option.isHeader) {
            classes.push('dropdown-header');
        }
        return classes;
    }

    clearSelection = () => {
        delete this.selected;
        this.onSelect.emit();
    }
}
