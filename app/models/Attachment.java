package models;

import models.base.OwnedModel;

import javax.persistence.Entity;

@Entity
public class Attachment extends OwnedModel {

    private String fileName;
    private String filePath;
    private String mimeType;

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
    public String getFileName() { return fileName; }
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

}
