import { NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamInfo } from '../calendar.service';

@Component({
    selector: 'xm-calendar-optional-sections',
    template: `
        <div class="student-enrolment-wrapper details-view">
            <div class="row mb-3" [ngClass]="sectionSelectionOk() ? '' : 'notactive'">
                <span class="col-md-12">
                    <h2 class="calendar-phase-title">2. {{ 'sitnet_exam_materials' | translate }}</h2>
                    <span class="calendar-phase-icon float-end" *ngIf="sectionSelectionOk()">
                        <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" />
                    </span>
                </span>
            </div>
            <div *ngFor="let section of examInfo.examSections">
                <div class="row">
                    <div class="col-md-12">
                        <div class="row">
                            <div class="col-md-6">
                                <strong>{{ 'sitnet_exam_section' | translate }}:</strong> {{ section.name }}
                            </div>
                            <div class="col-md-6">
                                <div *ngIf="section.optional" class="text text-success">
                                    {{ 'sitnet_optional_section' | translate | uppercase }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-12">
                        <div class="row">
                            <div class="col-md-6">
                                {{ section.description }}
                            </div>
                            <div class="col-md-6">
                                <div class="form-check" *ngIf="section.optional">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        value=""
                                        [(ngModel)]="section.selected"
                                        id="check1"
                                        (ngModelChange)="checkSectionSelections()"
                                    />
                                    <label class="form-check-label" for="check1">
                                        {{ 'sitnet_select_optional_section' | translate }}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row" *ngIf="section.examMaterials.length > 0">
                    <div class="col-md-12">
                        <strong>{{ 'sitnet_exam_materials' | translate }}</strong>
                    </div>
                </div>
                <div *ngFor="let material of section.examMaterials" class="row">
                    <span class="col-md-12">
                        {{ 'sitnet_name' | translate | uppercase }}: {{ material.name }}
                        <span *ngIf="material.author">
                            {{ 'sitnet_author' | translate | uppercase }}: {{ material.author }}
                        </span>
                        <span *ngIf="material.isbn"> ISBN: {{ material.isbn }} </span>
                    </span>
                </div>
            </div>
        </div>
    `,
    standalone: true,
    imports: [NgClass, NgIf, NgFor, FormsModule, UpperCasePipe, TranslateModule],
})
export class OptionalSectionsComponent {
    @Input() examInfo!: ExamInfo;
    @Output() selected = new EventEmitter<{ valid: boolean }>();

    checkSectionSelections = () => this.selected.emit({ valid: this.sectionSelectionOk() });

    sectionSelectionOk = () => this.examInfo.examSections.some((es) => !es.optional || es.selected);
}
