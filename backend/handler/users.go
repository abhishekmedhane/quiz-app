package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/dgrijalva/jwt-go"
	log "github.com/sirupsen/logrus"
)

type User struct {
	FirstName string `json:"firstName",dynamodbav:"firstName"`
	LastName  string `json:"lastName", dynamodbav:"lastName"`
	Email     string `json:"email", dynamodbav:"email"`
	Password  string `json:"password",dynamodbav:"password"`
}

func (p *User) FromJSON(r io.Reader) error {
	e := json.NewDecoder(r)
	return e.Decode(p)
}

func (p *User) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(p)
}

func (db *DB) RegisterUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	log.Info("RegisterUser hit")
	c := User{}

	err := c.FromJSON(r.Body)
	if err != nil {
		log.Errorf("Error Unmarshalling JSON: %s", err)
		JSONError(w, errStruct{Err: true, Msg: "Error Unmarshalling JSON"}, http.StatusInternalServerError)
		return
	}

	av, err := dynamodbattribute.MarshalMap(c)
	if err != nil {
		log.Errorf("Got error marshalling new movie item: %s", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Got error marshalling new movie item: %s", err)}, http.StatusInternalServerError)
		return
	}

	tableName := "users"

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = db.Client.PutItem(input)
	if err != nil {
		log.Errorf("Got error calling PutItem: %s", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Got error calling PutItem: %s", err)}, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	resp := ResponseMsg{Err: false, Msg: "User created successfully!"}
	e := json.NewEncoder(w)
	e.Encode(resp)
}

func (db *DB) SignInUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	log.Info("SignIn User hit")

	u := User{}

	err := u.FromJSON(r.Body)
	if err != nil {
		log.Errorf("Error Unmarshalling JSON: %s", err)
		JSONError(w, errStruct{Err: true, Msg: "Error Unmarshalling JSON"}, http.StatusInternalServerError)
		return
	}

	tableName := "users"

	result, err := db.Client.GetItem(
		&dynamodb.GetItemInput{
			TableName: aws.String(tableName),
			Key: map[string]*dynamodb.AttributeValue{
				"email": {
					S: aws.String(u.Email),
				},
			},
		},
	)
	if err != nil {
		log.Errorf("Got error calling GetItem: %s", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Got error calling GetItem: %s", err)}, http.StatusInternalServerError)
		return
	}

	if result.Item == nil {
		log.Error("Invalid email or password")
		JSONError(w, errStruct{Err: true, Msg: "Invalid email or password"}, http.StatusInternalServerError)
		return
	}

	user := User{}
	err = dynamodbattribute.UnmarshalMap(result.Item, &user)
	if err != nil {
		log.Errorf("Failed to unmarshal Record, %v", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Failed to unmarshal Record, %v", err)}, http.StatusInternalServerError)
		return
	}

	// verify Password
	if user.Password != u.Password {
		log.Error("Invalid email or password")
		JSONError(w, errStruct{Err: true, Msg: "Invalid email or password"}, http.StatusInternalServerError)
		return
	}

	// Generate JWT token
	tokenString, err := GenerateToken(user.Email, user.FirstName, user.LastName, "pikachu")
	if err != nil {
		log.Errorf("Failed to generate token, %v", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Failed to generate token, %v", err)}, http.StatusInternalServerError)
		return
	}

	// Return user details and token in response
	resp := struct {
		User  User   `json:"user"`
		Token string `json:"token"`
	}{
		User:  user,
		Token: tokenString,
	}

	e := json.NewEncoder(w)
	err = e.Encode(resp)
	if err != nil {
		log.Errorf("Failed to convert in JSON, %v", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Failed to convert in JSON, %v", err)}, http.StatusInternalServerError)
		return
	}
}

func GenerateToken(userID string, firstName string, lastName string, secretKey string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId":    userID,
		"firstName": firstName,
		"lastName":  lastName,
		"exp":       time.Now().Add(time.Hour * 1).Unix(),
	})
	return token.SignedString([]byte(secretKey))
}
