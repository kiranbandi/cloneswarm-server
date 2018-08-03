#!/bin/sh
# Author : Venkat Kiran Bandi

# Set parameters passed to the shell script
UNIQUE_ID=$1
REPO_NAME=$2
PROJECT_NAME=$3
# Name of the repository is hardcoded temporarily 
# But will be set from the shell params
REPO_NAME="https://github.com/alibaba/Sentinel.git"
PROJECT_NAME="Sentinel"


if [[ -z "$UNIQUE_ID" ]]
    then 
        echo "Exiting because , No ID passed for the project"
    else
        if [[ -z "$REPO_NAME" ]]
            then
                echo "No Git repository provided"
            else
                # Go to root path  
                cd ~/workspace 
                #Create an empty directory for that unique ID 
                PROJ_DIRECTORY="sandbox-$1"
                mkdir "$PROJ_DIRECTORY"
                # Go into that directory 
                cd "$PROJ_DIRECTORY"
                # Clone the GIT Repository 
                git clone "$REPO_NAME"
                # Run Nicad on the project
                nicad4 functions java "$PROJECT_NAME" defaultreport
        fi
fi



