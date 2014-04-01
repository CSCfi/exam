package models;

import play.Logger;
import play.db.ebean.Model;
import util.SitnetUtil;

import javax.persistence.*;
import java.sql.Timestamp;

@MappedSuperclass
abstract public class SitnetModel extends Model implements Cloneable {

	protected static final long serialVersionUID = 5201571045491048480L;

	@Id
	@GeneratedValue(strategy=GenerationType.AUTO)
    protected Long id;
	
//	@CreatedTimestamp
	protected Timestamp created;
	
	@OneToOne
	protected User creator;
	
//	@UpdatedTimestamp
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

    @Override
    protected Object clone() throws CloneNotSupportedException {

        SitnetModel copy = (SitnetModel)SitnetUtil.getClone(this);

        Logger.debug("clone: " + copy);

        return copy;
    }
}
