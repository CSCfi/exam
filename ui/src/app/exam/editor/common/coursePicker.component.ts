/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { Course } from '../../exam.model';
import { CoursePickerService } from './coursePicker.service';

interface CourseFilter {
    name?: string;
    code?: string;
}

@Component({
    selector: 'course-picker',
    templateUrl: './coursePicker.component.html',
})
export class CoursePickerComponent implements OnInit {
    @Input() course: Course;
    @Output() onUpdate = new EventEmitter<Course>();

    public filter: CourseFilter;
    loader: { name: { isOn: boolean }; code: { isOn: boolean } };

    constructor(private translate: TranslateService, private Course: CoursePickerService) {}

    ngOnInit() {
        this.filter = {
            name: this.course ? this.course.name : '',
            code: this.course ? this.course.code.split('_')[0] : '',
        };
        this.loader = {
            name: { isOn: false },
            code: { isOn: false },
        };
    }

    private showError = (term: string) =>
        toast.error(`${this.translate.instant('sitnet_course_not_found')} ( ${term}  )`);

    private getCourses$ = (category: 'name' | 'code', text$: Observable<string>): Observable<Course[]> =>
        text$.pipe(
            tap((term) => {
                this.setInputValue(category, term);
                this.toggleLoadingIcon(category, term.length >= 2);
            }),
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap((term) => (term.length < 2 ? from([]) : this.Course.getCourses$(category, term))),
            tap((courses) => {
                this.toggleLoadingIcon(category, false);
                if (courses.length === 0) {
                    this.showError(this.filter.code as string);
                }
            }),
        );

    getCoursesByCode$ = (text$: Observable<string>) => this.getCourses$('code', text$);
    getCoursesByName$ = (text$: Observable<string>) => this.getCourses$('name', text$);
    codeFormat = (c: Course) => c.code;
    nameFormat = (c: Course) => c.name;
    courseFormat = (c: Course) => (c.code.indexOf('_') === -1 ? `${c.code} ${c.name}` : `${c.code} <br /> ${c.name}`);

    onCourseSelect = (event: NgbTypeaheadSelectItemEvent) => {
        this.filter = { name: event.item.name, code: event.item.code.split('_')[0] };
        this.onUpdate.emit(event.item);
    };

    private toggleLoadingIcon = (filter: 'name' | 'code', isOn: boolean) => (this.loader[filter].isOn = isOn);
    private setInputValue = (filter: string, value: string) => {
        if (filter === 'code') {
            this.filter = { code: value };
        } else if (filter === 'name') {
            this.filter = { name: value };
        }
    };
}