// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models;

import jakarta.persistence.Entity;
import jakarta.persistence.Transient;
import models.base.OwnedModel;

@Entity
public class Attachment extends OwnedModel {

    private String fileName;
    private String filePath;
    private String mimeType;

    @Transient
    private String externalId;

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getMimeType() {
        return mimeType;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public Attachment copy() {
        Attachment a = new Attachment();
        a.setExternalId(this.getExternalId());
        a.setFileName(this.getFileName());
        a.setMimeType(this.getMimeType());
        a.setFilePath(this.getFilePath());
        return a;
    }
}
