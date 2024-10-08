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

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbHighlight, NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, tap } from 'rxjs/operators';
import type { Course } from 'src/app/exam/exam.model';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import { CoursePickerService } from './course-picker.service';

@Component({
    selector: 'xm-course-picker',
    templateUrl: './course-picker.component.html',
    styleUrls: ['../../exam.shared.scss'],
    standalone: true,
    imports: [FormsModule, NgbTypeahead, NgbHighlight, NgbPopover, TranslateModule],
})
export class CoursePickerComponent implements OnInit {
    @Input() course?: Course;
    @Output() updated = new EventEmitter<Course>();

    nameFilter = '';
    codeFilter = '';
    loader = {
        name: { isOn: false },
        code: { isOn: false },
    };

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private Course: CoursePickerService,
        private CourseCode: CourseCodeService,
    ) {}

    ngOnInit() {
        this.nameFilter = this.course ? this.course.name : '';
        this.codeFilter = this.course ? this.CourseCode.formatCode(this.course.code) : '';
    }

    getCoursesByCode$ = (text$: Observable<string>) => this.getCourses$('code', text$);
    getCoursesByName$ = (text$: Observable<string>) => this.getCourses$('name', text$);
    codeFormat = (c: Course | string) => (this.isCourse(c) ? c.code : c);
    nameFormat = (c: Course | string) => (this.isCourse(c) ? c.name : c);

    onCourseSelect = (event: NgbTypeaheadSelectItemEvent) => {
        this.codeFilter = this.CourseCode.formatCode(event.item.code);
        this.nameFilter = event.item.name;
        this.updated.emit(event.item);
    };

    private showError = (term: string) =>
        this.toast.error(`${this.translate.instant('i18n_course_not_found')} ( ${term}  )`);

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
                    this.showError(this.codeFilter);
                }
            }),
        );

    private isCourse = (input: string | Course): input is Course => (input as Course).code !== undefined;
    private toggleLoadingIcon = (filter: 'name' | 'code', isOn: boolean) => (this.loader[filter].isOn = isOn);
    private setInputValue = (filter: string, value: string) => {
        if (filter === 'code') {
            this.codeFilter = value;
            this.nameFilter = '';
        } else if (filter === 'name') {
            this.nameFilter = value;
            this.codeFilter = '';
        }
    };
}
