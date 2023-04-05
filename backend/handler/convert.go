package handler

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	log "github.com/sirupsen/logrus"
)

type fileOpt struct {
	sepratorHeader string
	pretty         bool
}

func NewFileOpt() *fileOpt {
	return &fileOpt{
		sepratorHeader: "",
		pretty:         false,
	}
}

type errStruct struct {
	Err bool   `json:"error,omitempty"`
	Msg string `json:"message,omitempty"`
}

func JSONError(w http.ResponseWriter, err interface{}, code int) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(err)
}

func ConvertCsvToJson(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	log.Info("Conver CSV to JSON hit")
	var err error
	var jsonD string
	fileOptObj := NewFileOpt()

	fileOptObj.sepratorHeader = r.Header.Get("separator")
	if fileOptObj.sepratorHeader == "" {
		JSONError(w, errStruct{Err: true, Msg: "Separator header is required"}, http.StatusBadRequest)
		return
	}

	prettyHeader := r.Header.Get("pretty")
	if prettyHeader == "" {
		prettyHeader = "false"
	}

	fileOptObj.pretty, err = strconv.ParseBool(prettyHeader)
	if err != nil {
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Parsing to pretty to bool: %v", err)}, http.StatusBadRequest)
		return
	}

	if !(fileOptObj.sepratorHeader == "comma" || fileOptObj.sepratorHeader == "semicolon") {
		JSONError(w, errStruct{Err: true, Msg: "Only comma or semicolon separators are allowed"}, http.StatusBadRequest)
	}
	// Parse our multipart form, 30 << 20 specifies a maximum
	// upload of 30 MB files.
	r.ParseMultipartForm(30 << 20)

	file, handler, err := r.FormFile("csv")
	if err != nil {
		log.Errorf("Error Retriving the File %v", err)
		JSONError(w, errStruct{Err: true, Msg: "CSV file is missing"}, http.StatusBadRequest)
		return
	}
	defer file.Close()

	fileName := strings.Split(handler.Filename, ".")
	if fileName[len(fileName)-1] != "csv" {
		log.Errorf(".%v extention is not supported", fileName[len(fileName)-1])
		JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf(".%v extention is not supported. Only support .csv extention files", fileName[len(fileName)-1])}, http.StatusBadRequest)
		return
	}

	writerChannel := make(chan map[string]string)
	done := make(chan bool)
	errorChan := make(chan bool)
	errorMsg := make(chan string)

	jsonContent := make(chan string)

	log.Infof("Starting processing %v file", handler.Filename)

	go processCsvFile(file, writerChannel, fileOptObj, errorChan, errorMsg)
	go writeJSONFile(jsonContent, writerChannel, done, fileOptObj.pretty)

	select {
	case <-errorChan:
		errMsg := <-errorMsg
		close(writerChannel)
		close(errorChan)
		close(errorMsg)
		JSONError(w, errStruct{Err: true, Msg: errMsg}, http.StatusInternalServerError)
		return
	case <-done:
		jsonD = <-jsonContent
		log.Info("Writing response")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(jsonD))
		log.Info("Response send")
	}

}

func processCsvFile(file multipart.File, writerChannel chan<- map[string]string, fileOptObj *fileOpt, errorChan chan<- bool, errorMsg chan<- string) {

	// Get Header line for keys
	var headers, line []string
	reader := csv.NewReader(file)

	if fileOptObj.sepratorHeader == "semicolon" {
		reader.Comma = ';'
	}

	headers, err := reader.Read()
	if err != nil {
		log.Error("Error reading file")
		errorChan <- true
		errorMsg <- "Error reading file"
	}

	for {
		line, err = reader.Read()

		if err == io.EOF {
			log.Info("Internal server error EOF")
			close(writerChannel)
			break
		} else if err != nil {
			log.Error("Internal server error")
			errorChan <- true
			errorMsg <- "Internal server error"
		}

		record, err := processLine(headers, line)
		if err != nil {
			log.Errorf("Line: %sError: %s\n", line, err)
			continue
		}

		writerChannel <- record
	}
}

func processLine(headers []string, dataList []string) (map[string]string, error) {
	if len(dataList) != len(headers) {
		return nil, errors.New("line doesn't match headers format. skipping")
	}

	recordMap := make(map[string]string)

	for i, name := range headers {
		name = strings.TrimLeft(name, " ")
		dataList[i] = strings.TrimLeft(dataList[i], " ")
		recordMap[name] = dataList[i]
	}

	return recordMap, nil
}

func getJSONFunc(pretty bool) (func(map[string]string) string, string) {
	var jsonFunc func(map[string]string) string
	var breakLine string
	if pretty {
		breakLine = "\n"
		jsonFunc = func(record map[string]string) string {
			jsonData, _ := json.MarshalIndent(record, "   ", "   ")
			return "   " + string(jsonData)
		}
	} else {
		breakLine = ""
		jsonFunc = func(record map[string]string) string {
			jsonData, _ := json.Marshal(record)
			return string(jsonData)
		}
	}
	return jsonFunc, breakLine
}

func writeJSONFile(jsonContent chan<- string, writerChannel <-chan map[string]string, done chan<- bool, pretty bool) {
	var jsonWriter strings.Builder
	jsonFunc, breakLine := getJSONFunc(pretty)

	log.Info("Writing JSON file...")

	jsonWriter.WriteString("[" + breakLine)
	first := true
	for {
		record, more := <-writerChannel
		if more {
			if !first {
				jsonWriter.WriteString("," + breakLine)
			} else {
				first = false
			}

			jsonData := jsonFunc(record)
			jsonWriter.WriteString(jsonData)
		} else {
			jsonWriter.WriteString(breakLine + "]")
			log.Info("Completed!")
			done <- true
			jsonContent <- jsonWriter.String()
			break
		}
	}
}
