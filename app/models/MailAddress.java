package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;


/**
 * Created by avainik on 4/8/14.
 */
@Entity
public class MailAddress extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private Long id;

    private String street;

    private String zip;

    // postitoimipakka
    private String city;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getStreet() {
        return street;
    }

    public void setStreet(String street) {
        this.street = street;
    }

    public String getZip() {
        return zip;
    }

    public void setZip(String zip) {
        this.zip = zip;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    @Override
    public String toString() {
        return street +", "+ city +", "+ zip;
    }
}
