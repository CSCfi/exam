package models;

import play.db.ebean.Model;

import javax.persistence.*;

/**
 * Created by avainik on 8/15/14.
 */
@Entity
public class GeneralSettings extends Model {

    @Id
	@GeneratedValue(strategy= GenerationType.AUTO)
    protected Long id;

    @Column(columnDefinition = "TEXT")
    private String eula;

    // Opettajalla on näin monta päivää tarkastaa tentti
    @Column(columnDefinition="numeric default 14")
    private long reviewDeadline;

    public long getReviewDeadline() {
        return reviewDeadline;
    }

    public void setReviewDeadline(long reviewDeadline) {
        this.reviewDeadline = reviewDeadline;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEula() {
        return eula;
    }

    public void setEula(String text) {
        this.eula = text;
    }
}
