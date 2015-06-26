package models;


import javax.persistence.Entity;

@Entity
public class UserLanguage extends GeneratedIdentityModel {

    private String nativeLanguageCode;

	private String nativeLanguageName;

    // Preferred language is other than native one
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

}
