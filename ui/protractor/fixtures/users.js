module.exports = {
  "role": [
    {
      "id": 1,
      "name": "ADMIN",
      "object_version": 1
    },
    {
      "id": 2,
      "name": "STUDENT",
      "object_version": 1
    },
    {
      "id": 3,
      "name": "TEACHER",
      "object_version": 1
    }
  ],
  "language": [
    {
      "code": "fi",
      "name": "suomi",
      "object_version": 1
    },
    {
      "code": "sv",
      "name": "svenska",
      "object_version": 1
    },
    {
      "code": "en",
      "name": "English",
      "object_version": 1
    }
  ],
  "app_user": [
    {
      "id": 10001,
      "email": "maika.opettaja@funet.fi",
      "eppn": "maikaope@funet.fi",
      "last_name": "Opettaja",
      "first_name": "Olli",
      "password": "1d0ebf168b86f79a0c34e81eb1fd70cd",
      "language_id": "fi",
      "user_agreement_accepted": true,
      "object_version": 1
    },
    {
      "id": 10002,
      "email": "sauli.student@funet.fi",
      "eppn": "saulistu@funet.fi",
      "last_name": "Student",
      "first_name": "Sauli",
      "password": "72e6570dbfeb95d5df59e08f1fa6302f",
      "language_id": "fi",
      "user_agreement_accepted": true,
      "object_version": 1
    }
  ],
  "app_user_role": [
    {
      "app_user_id": 10001,
      "role_id": 3,
    },
    {
      "app_user_id": 10002,
      "role_id": 2,
    },
    {
      "app_user_id": 10002,
      "role_id": 3,
    }
  ]
};
