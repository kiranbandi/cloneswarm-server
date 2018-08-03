#!/bin/sh
# Author : Venkat Kiran Bandi

# Name of the repository is hardcoded temporarily 
# But will be set from the shell params
REPO_NAME="https://github.com/alibaba/Sentinel.git"

if [[ -z "$1" ]]
    then 
        echo "Exiting because , No ID passed for the project"
    else
        if [[ -z "$2" ]]
            then
                echo "No Git repository provided"
            else
            # Print the name of the unique ID with which the shell script was launched
            echo "Unqiue ID for Project: $1"
            # Go to root path  
            cd ~/workspace 
            #Create an empty directory for that unique ID 
            PROJ_DIRECTORY="sandbox-$1"
            mkdir "$PROJ_DIRECTORY"
            # Go into that directory 
            cd "$PROJ_DIRECTORY"
            # Clone the GIT Repository 
            git clone "$REPO_NAME"
            # Go back one step in the working directory
            cd ..
            # Run Nicad on the project
            nicad4 functions java "$PROJ_DIRECTORY" defaultreport
        fi
fi



