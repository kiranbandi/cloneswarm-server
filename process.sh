#!/bin/sh
# Author : Venkat Kiran Bandi

# Set parameters passed to the shell script
UNIQUE_ID=$1
REPO_NAME=$2
PROJECT_NAME=$3
PROG_LANG=$4
GRANULARITY=$5

if [[ -z "$UNIQUE_ID" ]]
    then 
        echo "Exiting because , No ID passed for the project"
    else
        if [[ -z "$REPO_NAME" ]]
            then
                echo "No Git repository provided"
            else
                # Go to root path  
                cd "workspace" 
                #Create an empty directory for that unique ID 
                PROJ_DIRECTORY="sandbox-$1"
                mkdir "$PROJ_DIRECTORY"
                # Go into that directory 
                cd "$PROJ_DIRECTORY"
                # Clone the GIT Repository - Shallow clone to reduce server load
                git clone --depth 1 "$REPO_NAME"
                # Run Nicad on the project
                nicad4 "$GRANULARITY" "$PROG_LANG" "$PROJECT_NAME" defaultreport
        fi
fi


