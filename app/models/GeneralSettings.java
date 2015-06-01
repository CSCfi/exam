package models;

import javax.persistence.Column;
import javax.persistence.Entity;

@Entity
public class GeneralSettings extends GeneratedIdentityModel {

    @Column(columnDefinition = "TEXT")
    private String eula;

    @Column(columnDefinition="numeric default 14")
    private long reviewDeadline;

    public long getReviewDeadline() {
        return reviewDeadline;
    }

    public void setReviewDeadline(long reviewDeadline) {
        this.reviewDeadline = reviewDeadline;
    }

    public String getEula() {
        return eula;
    }

    public void setEula(String text) {
        eula = text;
    }
}
