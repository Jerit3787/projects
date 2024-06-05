#!/bin/bash

fileName=("index.html", "index.css")

echo "Installing gitfolio"

npm install gitfolio -g

echo "Successfully installed gitfolio"

echo "Building gitfolio profile"

gitfolio build Jerit3787 --theme dark --twitter Jerit3787

echo "Successfully built gitfolio profile"

echo "Checking existing files"

for i in ${!fileName[@]}; do
    echo "Comparing file content for ${fileName[$i]}"
    if cmp --silent "./dist/${fileName[$i]}" "./${fileName[$i]}"; then
        echo -e "File content is identical. No file replacement needed \n\n"
    else
        echo "File content for ${fileName[$i]} is not identical. Replacing file."
        cp ./dist/${fileName[$i]} ./${fileName[$i]}
        if [ $? -ne 0 ]; then
            # The command failed, print an error message 
            echo "The file replacement failed with exit status $?" 
            # Exit the script with a non-zero exit status to indicate failure 
            exit 1
        else
             # The command was successful, print a success message 
            echo -e "The file replacement succeeded with exit status $? \n\n"
        fi
    fi
done

rm -r dist

echo "Gitfolio profile successfully updated!"