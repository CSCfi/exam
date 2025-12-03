// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.attachment;

public interface AttachmentContainer {
    Attachment getAttachment();
    void setAttachment(Attachment attachment);
    void save();
}
