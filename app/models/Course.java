package models;

import play.db.ebean.Model;

import javax.persistence.*;


/*
 * Opintojakso
 * http://tietomalli.csc.fi/Opintojakso-kaavio.html
 * 
 * 
 */
@Entity
public class Course extends Model {

	@Id
	@GeneratedValue(strategy=GenerationType.AUTO)
	private Long id;
	
	// Tiedekunta/Organisaatio
    @OneToOne
	private Organisation organisation;

	// Opintojakson koodi, 811380A 	Tietokantojen perusteet 
	private String code;

	private String name;

    private String level;

	private CourseType type;
	
	// Laajuus, opintopisteet
	private Double credits;
	
	public Course() {
		
	}

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public Course(String name) {
		super();
		this.name = name;
	}

	public String getCode() {
		return code;
	}

	
	public Double getCredits() {
		return credits;
	}


	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public Organisation getOrganisation() {
		return organisation;
	}


	public CourseType getType() {
		return type;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public void setCredits(Double credits) {
		this.credits = credits;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public void setName(String name) {
		this.name = name;
	}

	public void setOrganisation(Organisation organisation) {
		this.organisation = organisation;
	}


	public void setType(CourseType type) {
		this.type = type;
	}

    @Override
    public String toString() {
        return "Course{" +
                "id=" + id +
                ", organisation=" + organisation +
                ", code='" + code + '\'' +
                ", name='" + name + '\'' +
                ", type=" + type +
                ", credits=" + credits +
                '}';
    }
}
