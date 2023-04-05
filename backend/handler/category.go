package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

type DB struct {
	Client *dynamodb.DynamoDB
}

type Category struct {
	CategoryName string                   `json:"categoryName",dynamodbav:"categoryName"`
	Data         []map[string]interface{} `json:"data",dynamodbav:"data"`
}

type ResponseMsg struct {
	Err bool   `json:"error"`
	Msg string `json:"msg"`
}

func (p *Category) FromJSON(r io.Reader) error {
	e := json.NewDecoder(r)
	return e.Decode(p)
}

func (p *Category) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(p)
}

func (db *DB) StoreCategory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	log.Info("Store category hit")

	c := Category{}

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

	tableName := "csv-json-data"

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
}

func (db *DB) GetCategory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	log.Info("Get category hit")

	var categories []Category

	tableName := "csv-json-data"

	input := &dynamodb.ScanInput{
		TableName: aws.String(tableName),
	}

	// Make the Scan request to DynamoDB
	result, err := db.Client.Scan(input)
	if err != nil {
		log.Errorf("Error scanning table: %v", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Error scanning table: %v", err)}, http.StatusInternalServerError)
		return
	}

	if result.Items == nil {
		log.Error("Could not find value")
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Error scanning table: %v", err)}, http.StatusInternalServerError)
		return
	}

	err = dynamodbattribute.UnmarshalListOfMaps(result.Items, &categories)
	if err != nil {
		log.Errorf("Error unmarshaling items: %v", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Error unmarshaling items: %v", err)}, http.StatusInternalServerError)
		return
	}

	e := json.NewEncoder(w)
	err = e.Encode(categories)
	if err != nil {
		log.Errorf("Failed to convert in JSON, %v", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Failed to convert in JSON, %v", err)}, http.StatusInternalServerError)
		return
	}
}

func (db *DB) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	log.Info("Delete category hit")

	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		log.Errorf("Failed no path parameter found!!!")
		JSONError(w, errStruct{Err: true, Msg: "Failed no path parameter found!!!"}, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	tableName := "csv-json-data"

	input := &dynamodb.DeleteItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"categoryName": {
				S: aws.String(id),
			},
		},
		TableName: aws.String(tableName),
	}

	_, err := db.Client.DeleteItem(input)
	if err != nil {
		log.Fatalf("Got error calling DeleteItem: %s", err)
		JSONError(w, errStruct{Err: true, Msg: "Got error calling DeleteItem!!!"}, http.StatusInternalServerError)
	}

	resp := ResponseMsg{Err: false, Msg: fmt.Sprintf("Record with %v is deleted!!!", id)}

	e := json.NewEncoder(w)
	err = e.Encode(resp)
	if err != nil {
		log.Errorf("Failed to convert in JSON, %v", err)
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Failed to convert in JSON, %v", err)}, http.StatusInternalServerError)
		return
	}
}
