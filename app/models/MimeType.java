package models;

import play.db.ebean.Model;

import javax.persistence.*;

@Entity
public class MimeType extends Model {

    @Version
    protected Long ebeanTimestamp;

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
