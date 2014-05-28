package models;

import javax.persistence.*;
import java.io.File;

@Entity
public class Attachment extends SitnetModel {

//	@ManyToOne(cascade = CascadeType.PERSIST)
//	private AbstractQuestion question;
/*
    private File file;
    private String filePath;
    private String mime;
*/
    private File attachment;

    public void setAttachment(File attachment) {
        System.out.println("attac " + attachment.getPath());
        this.attachment = attachment;
    }
    public File getAttachment() {
        return this.attachment;
    }
}
