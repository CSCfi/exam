package models;

import java.sql.Timestamp;

import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.MappedSuperclass;
import javax.persistence.OneToOne;

import play.db.ebean.Model;

@MappedSuperclass
public class SitnetModel extends play.db.ebean.Model {

	// TODO: Tämä luokka tulee olemaan kaikkien muiden model 
	// luokkien yläluokka.

	/**
	 * 
	 */
	private static final long serialVersionUID = 5201571045491048480L;

	@Id
	@GeneratedValue(strategy=GenerationType.AUTO)
	private Long id;
	
	private Timestamp created;
	
	@OneToOne
	private User creator;
	
	private Timestamp modified;
	
	@OneToOne
	private User modifier;
	
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
