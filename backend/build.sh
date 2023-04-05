#!/usr/bin/env bash 
set -xe

# install packages and dependencies
go mod download

# build command
go build -o bin/application application.go