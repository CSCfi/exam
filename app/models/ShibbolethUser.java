package models;

/**
 * Created by avainik on 5/6/14.
 */
public class ShibbolethUser {


    private String businessCategory;
    private String businessCode;

    // common name; Seppo Virtanen
    private String cn;
    private String CountryOfResidence;
    private String description;

    // Seppo
    private String displayName;
    private String eduCourseMember;
    private String eduCourseOffering;

    // student    ^(student|faculty|staff|employee|member|affiliate|alum)
    private String eduPersonAffiliation;
    private String eduPersonEntitlement;
    private String eduPersonOrgDN;
    private String eduPersonOrgUnitDN;

    // student
    private String eduPersonPrimaryAffiliation;
    private String eduPersonPrimaryOrgUnitDN;

    // saulistu@funet.fi    mkorhone@students.oamk.fi
    private String eduPersonPrincipalName;

    // staff@funet.fi   ^(student|faculty|staff|employee|member|affiliate|alum)@.*(;(student|faculty|staff|employee|member|affiliate|alum)@.*)*$
    private String eduPersonScopedAffiliation;
    private String eduPersonTargetedID;
    private String electronicIdentificationNumber;

    // opiskelijanumero
    private String employeeNumber;
    private String facsimileTelephoneNumber;
    private String funetEduPersonCreditUnits;
    private String funetEduPersonECTS;
    private String funetEduPersonEPPNTimeStamp;
    private String funetEduPersonHomeCity;
    private String funetEduPersonPrimaryStudyStart;
    private String funetEduPersonProgram;
    private String funetEduPersonSpecialisation;
    private String funetEduPersonStudentCategory;
    private String funetEduPersonStudentStatus;
    private String funetEduPersonStudentUnion;
    private String funetEduPersonStudyStart;
    private String funetEduPersonStudyToEnd;
    private String funetEduPersonTargetDegree;

    // Seppo Matinpoika Johannes Virtanen
    private String givenName;
    private String homePhone;
    private String homePostalAddress;
    private String hyCampus;
    private String initials;
    private String jpegPhoto;
    private String l;
    private String labeledURI;

    /// sitnet.admin@funet.fi
    private String mail;
    private String mobile;
    private String nationalIdentificationNumber;
    private String Nickname;

    //2.4.14. o / organizationName
    private String o;

    // 2.4.15. ou/organizationalUnitName
    private String ou;
    private String postalAddress;
    private String postalCode;
    private String postOfficeBox;

    // fi
    private String preferredLanguage;
    private String role;
    private String schacCountryOfCitizenship;
    private String schacDateOfBirth;
    private String schacGender;

    // Specifies a persons home organization using the domain name of th organization.
    /// schacHomeOrganization:tut.fi
    private String schacHomeOrganization;

    // Type of a Home Organization
    // schacHomeOrganizationType:
    // urn:mace:terena.org:schac:homeOrganizationType:fi:university
    // schacHomeOrganizationType:
    // urn:mace:terena.org:schac:homeOrganizationType:fi:polytechnic
    private String schacHomeOrganizationType;
    private String schacMotherTongue;

    //  (supersedes funetEduPersonStudentID)
    // This might be Student number, Employee number,...
    private String schacPersonalUniqueCode;

    // henkilötunnus
    // urn:mace:terena.org:schac:personalUniqueID:fi:FIC:260667-123F
    private String schacPersonalUniqueID;
    private String schacPlaceOfBirth;
    private String seeAlso;

    // Surname; Virtanen
    private String sn;
    private String street;
    private String svnResourceID;
    private String svnSWAsioEduErm;

    // +358 9876541
    private String telephoneNumber;

    // Title: professor
    private String title;
    private String tutoikeudet;

    // saulistu
    private String uid;
    private String urkundaddress;
    private String userCertificate;
    private String userPresenceID;
    private String userStatus;



    public String getBusinessCategory() {
        return businessCategory;
    }

    public void setBusinessCategory(String businessCategory) {
        this.businessCategory = businessCategory;
    }

    public String getBusinessCode() {
        return businessCode;
    }

    public void setBusinessCode(String businessCode) {
        this.businessCode = businessCode;
    }

    public String getCn() {
        return cn;
    }

    public void setCn(String cn) {
        this.cn = cn;
    }

    public String getCountryOfResidence() {
        return CountryOfResidence;
    }

    public void setCountryOfResidence(String countryOfResidence) {
        CountryOfResidence = countryOfResidence;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getEduCourseMember() {
        return eduCourseMember;
    }

    public void setEduCourseMember(String eduCourseMember) {
        this.eduCourseMember = eduCourseMember;
    }

    public String getEduCourseOffering() {
        return eduCourseOffering;
    }

    public void setEduCourseOffering(String eduCourseOffering) {
        this.eduCourseOffering = eduCourseOffering;
    }

    public String getEduPersonAffiliation() {
        return eduPersonAffiliation;
    }

    public void setEduPersonAffiliation(String eduPersonAffiliation) {
        this.eduPersonAffiliation = eduPersonAffiliation;
    }

    public String getEduPersonEntitlement() {
        return eduPersonEntitlement;
    }

    public void setEduPersonEntitlement(String eduPersonEntitlement) {
        this.eduPersonEntitlement = eduPersonEntitlement;
    }

    public String getEduPersonOrgDN() {
        return eduPersonOrgDN;
    }

    public void setEduPersonOrgDN(String eduPersonOrgDN) {
        this.eduPersonOrgDN = eduPersonOrgDN;
    }

    public String getEduPersonOrgUnitDN() {
        return eduPersonOrgUnitDN;
    }

    public void setEduPersonOrgUnitDN(String eduPersonOrgUnitDN) {
        this.eduPersonOrgUnitDN = eduPersonOrgUnitDN;
    }

    public String getEduPersonPrimaryAffiliation() {
        return eduPersonPrimaryAffiliation;
    }

    public void setEduPersonPrimaryAffiliation(String eduPersonPrimaryAffiliation) {
        this.eduPersonPrimaryAffiliation = eduPersonPrimaryAffiliation;
    }

    public String getEduPersonPrimaryOrgUnitDN() {
        return eduPersonPrimaryOrgUnitDN;
    }

    public void setEduPersonPrimaryOrgUnitDN(String eduPersonPrimaryOrgUnitDN) {
        this.eduPersonPrimaryOrgUnitDN = eduPersonPrimaryOrgUnitDN;
    }

    public String getEduPersonPrincipalName() {
        return eduPersonPrincipalName;
    }

    public void setEduPersonPrincipalName(String eduPersonPrincipalName) {
        this.eduPersonPrincipalName = eduPersonPrincipalName;
    }

    public String getEduPersonScopedAffiliation() {
        return eduPersonScopedAffiliation;
    }

    public void setEduPersonScopedAffiliation(String eduPersonScopedAffiliation) {
        this.eduPersonScopedAffiliation = eduPersonScopedAffiliation;
    }

    public String getEduPersonTargetedID() {
        return eduPersonTargetedID;
    }

    public void setEduPersonTargetedID(String eduPersonTargetedID) {
        this.eduPersonTargetedID = eduPersonTargetedID;
    }

    public String getElectronicIdentificationNumber() {
        return electronicIdentificationNumber;
    }

    public void setElectronicIdentificationNumber(String electronicIdentificationNumber) {
        this.electronicIdentificationNumber = electronicIdentificationNumber;
    }

    public String getEmployeeNumber() {
        return employeeNumber;
    }

    public void setEmployeeNumber(String employeeNumber) {
        this.employeeNumber = employeeNumber;
    }

    public String getFacsimileTelephoneNumber() {
        return facsimileTelephoneNumber;
    }

    public void setFacsimileTelephoneNumber(String facsimileTelephoneNumber) {
        this.facsimileTelephoneNumber = facsimileTelephoneNumber;
    }

    public String getFunetEduPersonCreditUnits() {
        return funetEduPersonCreditUnits;
    }

    public void setFunetEduPersonCreditUnits(String funetEduPersonCreditUnits) {
        this.funetEduPersonCreditUnits = funetEduPersonCreditUnits;
    }

    public String getFunetEduPersonECTS() {
        return funetEduPersonECTS;
    }

    public void setFunetEduPersonECTS(String funetEduPersonECTS) {
        this.funetEduPersonECTS = funetEduPersonECTS;
    }

    public String getFunetEduPersonEPPNTimeStamp() {
        return funetEduPersonEPPNTimeStamp;
    }

    public void setFunetEduPersonEPPNTimeStamp(String funetEduPersonEPPNTimeStamp) {
        this.funetEduPersonEPPNTimeStamp = funetEduPersonEPPNTimeStamp;
    }

    public String getFunetEduPersonHomeCity() {
        return funetEduPersonHomeCity;
    }

    public void setFunetEduPersonHomeCity(String funetEduPersonHomeCity) {
        this.funetEduPersonHomeCity = funetEduPersonHomeCity;
    }

    public String getFunetEduPersonPrimaryStudyStart() {
        return funetEduPersonPrimaryStudyStart;
    }

    public void setFunetEduPersonPrimaryStudyStart(String funetEduPersonPrimaryStudyStart) {
        this.funetEduPersonPrimaryStudyStart = funetEduPersonPrimaryStudyStart;
    }

    public String getFunetEduPersonProgram() {
        return funetEduPersonProgram;
    }

    public void setFunetEduPersonProgram(String funetEduPersonProgram) {
        this.funetEduPersonProgram = funetEduPersonProgram;
    }

    public String getFunetEduPersonSpecialisation() {
        return funetEduPersonSpecialisation;
    }

    public void setFunetEduPersonSpecialisation(String funetEduPersonSpecialisation) {
        this.funetEduPersonSpecialisation = funetEduPersonSpecialisation;
    }

    public String getFunetEduPersonStudentCategory() {
        return funetEduPersonStudentCategory;
    }

    public void setFunetEduPersonStudentCategory(String funetEduPersonStudentCategory) {
        this.funetEduPersonStudentCategory = funetEduPersonStudentCategory;
    }

    public String getFunetEduPersonStudentStatus() {
        return funetEduPersonStudentStatus;
    }

    public void setFunetEduPersonStudentStatus(String funetEduPersonStudentStatus) {
        this.funetEduPersonStudentStatus = funetEduPersonStudentStatus;
    }

    public String getFunetEduPersonStudentUnion() {
        return funetEduPersonStudentUnion;
    }

    public void setFunetEduPersonStudentUnion(String funetEduPersonStudentUnion) {
        this.funetEduPersonStudentUnion = funetEduPersonStudentUnion;
    }

    public String getFunetEduPersonStudyStart() {
        return funetEduPersonStudyStart;
    }

    public void setFunetEduPersonStudyStart(String funetEduPersonStudyStart) {
        this.funetEduPersonStudyStart = funetEduPersonStudyStart;
    }

    public String getFunetEduPersonStudyToEnd() {
        return funetEduPersonStudyToEnd;
    }

    public void setFunetEduPersonStudyToEnd(String funetEduPersonStudyToEnd) {
        this.funetEduPersonStudyToEnd = funetEduPersonStudyToEnd;
    }

    public String getFunetEduPersonTargetDegree() {
        return funetEduPersonTargetDegree;
    }

    public void setFunetEduPersonTargetDegree(String funetEduPersonTargetDegree) {
        this.funetEduPersonTargetDegree = funetEduPersonTargetDegree;
    }

    public String getGivenName() {
        return givenName;
    }

    public void setGivenName(String givenName) {
        this.givenName = givenName;
    }

    public String getHomePhone() {
        return homePhone;
    }

    public void setHomePhone(String homePhone) {
        this.homePhone = homePhone;
    }

    public String getHomePostalAddress() {
        return homePostalAddress;
    }

    public void setHomePostalAddress(String homePostalAddress) {
        this.homePostalAddress = homePostalAddress;
    }

    public String getHyCampus() {
        return hyCampus;
    }

    public void setHyCampus(String hyCampus) {
        this.hyCampus = hyCampus;
    }

    public String getInitials() {
        return initials;
    }

    public void setInitials(String initials) {
        this.initials = initials;
    }

    public String getJpegPhoto() {
        return jpegPhoto;
    }

    public void setJpegPhoto(String jpegPhoto) {
        this.jpegPhoto = jpegPhoto;
    }

    public String getL() {
        return l;
    }

    public void setL(String l) {
        this.l = l;
    }

    public String getLabeledURI() {
        return labeledURI;
    }

    public void setLabeledURI(String labeledURI) {
        this.labeledURI = labeledURI;
    }

    public String getMail() {
        return mail;
    }

    public void setMail(String mail) {
        this.mail = mail;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getNationalIdentificationNumber() {
        return nationalIdentificationNumber;
    }

    public void setNationalIdentificationNumber(String nationalIdentificationNumber) {
        this.nationalIdentificationNumber = nationalIdentificationNumber;
    }

    public String getNickname() {
        return Nickname;
    }

    public void setNickname(String nickname) {
        Nickname = nickname;
    }

    public String getO() {
        return o;
    }

    public void setO(String o) {
        this.o = o;
    }

    public String getOu() {
        return ou;
    }

    public void setOu(String ou) {
        this.ou = ou;
    }

    public String getPostalAddress() {
        return postalAddress;
    }

    public void setPostalAddress(String postalAddress) {
        this.postalAddress = postalAddress;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getPostOfficeBox() {
        return postOfficeBox;
    }

    public void setPostOfficeBox(String postOfficeBox) {
        this.postOfficeBox = postOfficeBox;
    }

    public String getPreferredLanguage() {
        return preferredLanguage;
    }

    public void setPreferredLanguage(String preferredLanguage) {
        this.preferredLanguage = preferredLanguage;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getSchacCountryOfCitizenship() {
        return schacCountryOfCitizenship;
    }

    public void setSchacCountryOfCitizenship(String schacCountryOfCitizenship) {
        this.schacCountryOfCitizenship = schacCountryOfCitizenship;
    }

    public String getSchacDateOfBirth() {
        return schacDateOfBirth;
    }

    public void setSchacDateOfBirth(String schacDateOfBirth) {
        this.schacDateOfBirth = schacDateOfBirth;
    }

    public String getSchacGender() {
        return schacGender;
    }

    public void setSchacGender(String schacGender) {
        this.schacGender = schacGender;
    }

    public String getSchacHomeOrganization() {
        return schacHomeOrganization;
    }

    public void setSchacHomeOrganization(String schacHomeOrganization) {
        this.schacHomeOrganization = schacHomeOrganization;
    }

    public String getSchacHomeOrganizationType() {
        return schacHomeOrganizationType;
    }

    public void setSchacHomeOrganizationType(String schacHomeOrganizationType) {
        this.schacHomeOrganizationType = schacHomeOrganizationType;
    }

    public String getSchacMotherTongue() {
        return schacMotherTongue;
    }

    public void setSchacMotherTongue(String schacMotherTongue) {
        this.schacMotherTongue = schacMotherTongue;
    }

    public String getSchacPersonalUniqueCode() {
        return schacPersonalUniqueCode;
    }

    public void setSchacPersonalUniqueCode(String schacPersonalUniqueCode) {
        this.schacPersonalUniqueCode = schacPersonalUniqueCode;
    }

    public String getSchacPersonalUniqueID() {
        return schacPersonalUniqueID;
    }

    public void setSchacPersonalUniqueID(String schacPersonalUniqueID) {
        this.schacPersonalUniqueID = schacPersonalUniqueID;
    }

    public String getSchacPlaceOfBirth() {
        return schacPlaceOfBirth;
    }

    public void setSchacPlaceOfBirth(String schacPlaceOfBirth) {
        this.schacPlaceOfBirth = schacPlaceOfBirth;
    }

    public String getSeeAlso() {
        return seeAlso;
    }

    public void setSeeAlso(String seeAlso) {
        this.seeAlso = seeAlso;
    }

    public String getSn() {
        return sn;
    }

    public void setSn(String sn) {
        this.sn = sn;
    }

    public String getStreet() {
        return street;
    }

    public void setStreet(String street) {
        this.street = street;
    }

    public String getSvnResourceID() {
        return svnResourceID;
    }

    public void setSvnResourceID(String svnResourceID) {
        this.svnResourceID = svnResourceID;
    }

    public String getSvnSWAsioEduErm() {
        return svnSWAsioEduErm;
    }

    public void setSvnSWAsioEduErm(String svnSWAsioEduErm) {
        this.svnSWAsioEduErm = svnSWAsioEduErm;
    }

    public String getTelephoneNumber() {
        return telephoneNumber;
    }

    public void setTelephoneNumber(String telephoneNumber) {
        this.telephoneNumber = telephoneNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTutoikeudet() {
        return tutoikeudet;
    }

    public void setTutoikeudet(String tutoikeudet) {
        this.tutoikeudet = tutoikeudet;
    }

    public String getUid() {
        return uid;
    }

    public void setUid(String uid) {
        this.uid = uid;
    }

    public String getUrkundaddress() {
        return urkundaddress;
    }

    public void setUrkundaddress(String urkundaddress) {
        this.urkundaddress = urkundaddress;
    }

    public String getUserCertificate() {
        return userCertificate;
    }

    public void setUserCertificate(String userCertificate) {
        this.userCertificate = userCertificate;
    }

    public String getUserPresenceID() {
        return userPresenceID;
    }

    public void setUserPresenceID(String userPresenceID) {
        this.userPresenceID = userPresenceID;
    }

    public String getUserStatus() {
        return userStatus;
    }

    public void setUserStatus(String userStatus) {
        this.userStatus = userStatus;
    }
}
