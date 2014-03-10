package models;

import play.db.ebean.Model;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;


/*
 * Kieli
 * http://tietomalli.csc.fi/Kieli.html
 * 
 * 
 */
@Entity
public class UserLanguage extends Model {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

	// käyttäjänä äidinkieli
	private String nativeLanguageCode;

	private String nativeLanguageName;

	
	/*
	 *  käyttäjä saattaa haluta käyttää järjestelmää 
	 *  eri kielellä kuin äidinkielellä
	 */
	private String UILanguageCode;
	
	private String UILanguageName;

	public String getNativeLanguageCode() {
		return nativeLanguageCode;
	}

	public void setNativeLanguageCode(String nativeLanguageCode) {
		this.nativeLanguageCode = nativeLanguageCode;
	}

	public String getNativeLanguageName() {
		return nativeLanguageName;
	}

	public void setNativeLanguageName(String nativeLanguageName) {
		this.nativeLanguageName = nativeLanguageName;
	}

	public String getUILanguageCode() {
		return UILanguageCode;
	}

	public void setUILanguageCode(String uILanguageCode) {
		UILanguageCode = uILanguageCode;
	}

	public String getUILanguageName() {
		return UILanguageName;
	}

	public void setUILanguageName(String uILanguageName) {
		UILanguageName = uILanguageName;
	}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }
}
