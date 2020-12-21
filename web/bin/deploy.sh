#!/bin/sh

last_commit=$(git log --pretty=format:%H -n1)

echo "Hi. You will now deploy for $last_commit."

# Get branch name
# https://stackoverflow.com/a/1593487
branch_name=$(git symbolic-ref -q HEAD)
branch_name=${branch_name##refs/heads/}
branch_name=${branch_name:-HEAD}

# https://stackoverflow.com/a/9727942
if [ $branch_name = "main" ]; then
  echo "You're on the main branch, wow!"
  npx gh-pages --dist dist --add --message "Deploy $last_commit to GitHub Pages"
else
  echo "Deploying to $branch_name/"
  npx gh-pages --dist dist --dest $branch_name --message "Deploy $last_commit to GitHub Pages from $branch_name"
fi
