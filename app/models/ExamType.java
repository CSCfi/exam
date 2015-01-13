package models;


import play.db.ebean.Model;

import javax.persistence.*;
import java.util.Date;

/*
 * Opetuksen toteutus
 * http://tietomalli.csc.fi/Opetuksen%20toteutus-kaavio.html
 * 
 * <Opetustapahtuman tyyppi> voi olla esim luento tai tentti.
 * 
 */
@Entity
public class ExamType extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Date ebeanTimestamp;

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private Long id;

	// TDOD: miten erilaiset tenttityypit määritellään?
	// kaikille avoin, vain kutsusta, jne
	private String type;

    public ExamType(String type) {
        this.type = type;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
