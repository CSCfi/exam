// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam;

import io.ebean.annotation.EnumValue;

public enum GradeType {
    @EnumValue("1")
    GRADED,
    @EnumValue("2")
    NOT_GRADED,
    @EnumValue("3")
    POINT_GRADED,
}
