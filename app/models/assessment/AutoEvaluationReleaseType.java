// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment;

import io.ebean.annotation.EnumValue;

public enum AutoEvaluationReleaseType {
    @EnumValue("1")
    IMMEDIATE,
    @EnumValue("2")
    GIVEN_DATE,
    @EnumValue("3")
    GIVEN_AMOUNT_DAYS,
    @EnumValue("4")
    AFTER_EXAM_PERIOD,
    @EnumValue("5")
    NEVER,
}
