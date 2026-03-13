// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment;

import io.ebean.annotation.EnumValue;

public enum ExamFeedbackReleaseType {
    @EnumValue("1")
    ONCE_LOCKED,
    @EnumValue("2")
    GIVEN_DATE,
}
