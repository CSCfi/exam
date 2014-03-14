package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;

@MappedSuperclass
public class SitnetModel extends Model {

	protected static final long serialVersionUID = 5201571045491048480L;

	@Id
	@GeneratedValue(strategy=GenerationType.AUTO)
    protected Long id;
	
	protected Timestamp created;
	
	@OneToOne
	protected User creator;
	
	protected Timestamp modified;
	
	@OneToOne
	protected User modifier;
	
	public SitnetModel() {
		super();
	}
	
	public SitnetModel(User creator) {
		super();
		this.creator = creator;
	}

	public Long getId() {
		return id;
	}

    public void setId(Long id) {
		this.id = id;
	}

    public Timestamp getCreated() {
		return created;
	}

    public void setCreated(Timestamp created) {
		this.created = created;
	}

    public User getCreator() {
		return creator;
	}

    public void setCreator(User creator) {
		this.creator = creator;
	}

    public Timestamp getModified() {
		return modified;
	}

    public void setModified(Timestamp modified) {
		this.modified = modified;
	}

    public User getModifier() {
		return modifier;
	}

    public void setModifier(User modifier) {
		this.modifier = modifier;
	}

}
