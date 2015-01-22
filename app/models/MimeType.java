package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
public class MimeType extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;

    @Transient
	public static final String COMMENT ="comment";
    @Transient
	public static final String IMAGE ="image";
	@Transient
	public static final String TEXT ="text";

	private String type;

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}
	
	
}
