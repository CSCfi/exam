// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam;

import io.ebean.annotation.EnumValue;

public enum ExamState {
    @EnumValue("1")
    DRAFT,
    @EnumValue("2")
    SAVED,
    @EnumValue("3")
    PUBLISHED,
    @EnumValue("4")
    STUDENT_STARTED,
    @EnumValue("5")
    REVIEW,
    @EnumValue("6")
    REVIEW_STARTED,
    @EnumValue("7")
    GRADED,
    @EnumValue("13")
    PRE_PUBLISHED,
    @EnumValue("8")
    GRADED_LOGGED,
    @EnumValue("9")
    ARCHIVED,
    @EnumValue("10")
    ABORTED,
    @EnumValue("11")
    DELETED,
    @EnumValue("12")
    REJECTED,
    @EnumValue("14")
    INITIALIZED,
}
