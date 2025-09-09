// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
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

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Course = inject(CoursePickerService);
    private CourseCode = inject(CourseCodeService);

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
