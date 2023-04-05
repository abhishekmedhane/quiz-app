package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/abhishekmedhane/csv-to-json/handler"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	jwt "github.com/dgrijalva/jwt-go"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	log "github.com/sirupsen/logrus"
)

type errStruct struct {
	Err bool   `json:"error,omitempty"`
	Msg string `json:"message,omitempty"`
}

func init() {
	log.SetOutput(os.Stdout)
	log.SetFormatter(&log.TextFormatter{
		ForceColors:   true,
		FullTimestamp: true,
	})
	var envLogLevel string
	if os.Getenv("LOG_LEVEL") == "" {
		envLogLevel = "info"
	} else {
		envLogLevel = os.Getenv("LOG_LEVEL")
	}

	logLevel, err := log.ParseLevel(envLogLevel)
	if err != nil {
		logLevel = log.InfoLevel
	}

	log.SetLevel(logLevel)
}

func getTokenFromHeader(r *http.Request) (*jwt.Token, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("no token in Authorization Header")
	}

	// The header format should be "Authorization: Bearer <token>"
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return nil, errors.New("invalid Authorization Header")
	}

	tokenStr := parts[1]

	token, err := jwt.ParseWithClaims(tokenStr, &jwt.StandardClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}

		// Return the secret key used to sign the token
		return []byte("pikachu"), nil
	})

	if err != nil {
		return nil, err
	}
	return token, nil
}

func verifyToken(token *jwt.Token) (*jwt.StandardClaims, error) {
	claims, ok := token.Claims.(*jwt.StandardClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid Token")
	}

	return claims, nil
}

func requireTokenAuthentication(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify token here
		token, err := getTokenFromHeader(r)
		if err != nil {
			handler.JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Unauthorized: %v", err)}, http.StatusUnauthorized)
			return
		}

		claims, err := verifyToken(token)
		if err != nil {
			handler.JSONError(w, errStruct{Err: true, Msg: fmt.Sprintf("Unauthorized: %v", err)}, http.StatusUnauthorized)
			return
		}

		// Add claims to the request context
		ctx := context.WithValue(r.Context(), "claims", claims)

		// Call the original handler with the new context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func main() {
	var apiPort string = os.Getenv("API_PORT")
	if apiPort == "" {
		apiPort = "80"
	}

	// sess, err := session.NewSession(&aws.Config{
	// 	Region:      aws.String("us-east-1"),
	// 	Credentials: credentials.NewEnvCredentials(),
	// })
	sess, err := session.NewSessionWithOptions(session.Options{
		Config: aws.Config{
			Region: aws.String("us-east-1"),
		},
		SharedConfigState: session.SharedConfigEnable,
	})
	if err != nil {
		log.Error("Error creating AWS session")
	}
	svc := dynamodb.New(sess)

	dbClient := handler.DB{
		Client: svc,
	}

	r := mux.NewRouter()
	r.HandleFunc("/api/health", handler.Health).Methods(http.MethodGet)
	r.HandleFunc("/api/convert", handler.ConvertCsvToJson).Methods(http.MethodPost)

	r.HandleFunc("/api/store-category", requireTokenAuthentication(dbClient.StoreCategory)).Methods(http.MethodPost)
	r.HandleFunc("/api/get-categories", requireTokenAuthentication(dbClient.GetCategory)).Methods(http.MethodGet)
	r.HandleFunc("/api/delete-category/{id}", requireTokenAuthentication(dbClient.DeleteCategory)).Methods(http.MethodDelete)
	r.HandleFunc("/api/registration", dbClient.RegisterUser).Methods(http.MethodPost)
	r.HandleFunc("/api/signin", dbClient.SignInUser).Methods(http.MethodPost)

	loggedRouter := handlers.LoggingHandler(os.Stdout, r)
	// cors
	ch := cors.AllowAll().Handler(loggedRouter)
	s := &http.Server{
		Addr:    fmt.Sprintf(":%v", apiPort),
		Handler: ch,
	}
	go func() {
		log.Infof("Server is running on : %v", apiPort)

		if err := s.ListenAndServe(); err != nil {
			log.Errorf("Server failed to start : %s", err)
			os.Exit(1)
		}
	}()

	//trap sigterm or interupt and gracefully shutdown the server
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGINT)
	signal.Notify(c, syscall.SIGTERM)

	// Block until a signal is received
	sig := <-c
	log.Infof("Got signal: %v", sig)

	// gracefully shutdown the server, waiting max 30 seconds for current operations to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer func() {
		cancel()
	}()

	if err := s.Shutdown(ctx); err != nil {
		log.Fatalf("Server Shutdown Failed:%+v", err)
	}
	log.Info("Server Exited Properly")
}
