package models;

import play.data.format.Formats.DateTime;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.Date;

@MappedSuperclass
public abstract class BasicModel extends Model {

	@Id
	@GeneratedValue(strategy=GenerationType.AUTO)
    protected Long id;
	
	@Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Date ebeanTimestamp;
	
    @Temporal(TemporalType.TIMESTAMP)
    @DateTime(pattern="yyyy/MM/dd")
    protected Date created;
	
	@OneToOne
    protected User creator;
	
    @Temporal(TemporalType.TIMESTAMP)
    protected Date modified;
	
	@OneToOne
    protected User modifier;
	
	public BasicModel() {
	}
	
	public Long getId() {
		return id;
	}

    public void setId(Long id) {
		this.id = id;
	}

    public Date getCreated() {
		return created;
	}

    public void setCreated(Date created) {
		this.created = created;
	}

    public User getCreator() {
		return creator;
	}

    public void setCreator(User creator) {
		this.creator = creator;
	}

    public Date getModified() {
		return modified;
	}

    public void setModified(Date modified) {
		this.modified = modified;
	}

    public User getModifier() {
		return modifier;
	}

    public void setModifier(User modifier) {
		this.modifier = modifier;
	}

}
