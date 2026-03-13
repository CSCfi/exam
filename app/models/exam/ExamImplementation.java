// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam;

import io.ebean.annotation.EnumValue;

public enum ExamImplementation {
    @EnumValue("1")
    AQUARIUM,
    @EnumValue("2")
    CLIENT_AUTH,
    @EnumValue("3")
    WHATEVER,
}
