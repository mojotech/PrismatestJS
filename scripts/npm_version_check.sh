#!/bin/bash
## Description:
## This script will read the current version number from
## the `package.json` file and compare it to the latest
## availabe version of this same package on the NPM registry.
## If the current version is not greater than (meaning it will
## be a newly released version) this script will exit with a
## non-zero status code.

set -o errexit -o pipefail -o nounset -o noclobber
shopt -s nullglob

PACKAGENAME=$1
PACKAGELOCATION=$2

scriptPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
packageMeta="${scriptPath}/../${PACKAGELOCATION}package.json"
echo "package.json path: ${packageMeta}"

SEMVER_REGEX="^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(\\-[0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*)?(\\+[0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*)?$"

function validate-version {
  local version=$1
  if [[ "$version" =~ $SEMVER_REGEX ]]; then
    # if a second argument is passed, store the result in var named by $2
    if [ "$#" -eq "2" ]; then
      local major=${BASH_REMATCH[1]}
      local minor=${BASH_REMATCH[2]}
      local patch=${BASH_REMATCH[3]}
      local prere=${BASH_REMATCH[4]}
      local build=${BASH_REMATCH[5]}
      eval "$2=(\"$major\" \"$minor\" \"$patch\" \"$prere\" \"$build\")"
    else
      echo "$version"
    fi
  else
    error "version $version does not match the semver scheme 'X.Y.Z(-PRERELEASE)(+BUILD)'. See help for more information."
  fi
}

function compare-version {
  validate-version "$1" V
  validate-version "$2" V_

  # MAJOR, MINOR and PATCH should compare numericaly
  for i in 0 1 2; do
    local diff=$((${V[$i]} - ${V_[$i]}))
    if [[ $diff -lt 0 ]]; then
      echo -1; return 0
    elif [[ $diff -gt 0 ]]; then
      echo 1; return 0
    fi
  done

  # PREREL should compare with the ASCII order.
  if [[ -z "${V[3]}" ]] && [[ -n "${V_[3]}" ]]; then
    echo -1; return 0;
  elif [[ -n "${V[3]}" ]] && [[ -z "${V_[3]}" ]]; then
    echo 1; return 0;
  elif [[ -n "${V[3]}" ]] && [[ -n "${V_[3]}" ]]; then
    if [[ "${V[3]}" > "${V_[3]}" ]]; then
      echo 1; return 0;
    elif [[ "${V[3]}" < "${V_[3]}" ]]; then
      echo -1; return 0;
    fi
  fi

  echo 0
}

function existsCheck() {
    ELINE=$(npm show $PACKAGENAME version 2>&1 | grep "404.*$PACKAGENAME.*is not in the npm registry")

    if [[ -n "$ELINE" ]]; then
        echo 1; return 0;
    else
        echo 0; return 0;
    fi
}

function versionCheck() {
  echo "Checking pacakge version bump"

  newVersion=$( grep '"version":' ${packageMeta} | cut -d\" -f4 )
  echo "  current version:    ${newVersion}"

  exists=$(existsCheck)

  # does not exist
  if [[ $exists -eq 1 ]]; then
      echo "* Package does not exist, version ok"
      exit 0
  fi

  npmVersion=$( npm show $PACKAGENAME version )
  echo "  latest NPM version: ${npmVersion}"

  comparedResult=$( compare-version ${newVersion} ${npmVersion} )
  if [[ $comparedResult -lt 1 ]]; then
    echo "* Current version is older or equal to currently published version!."
    echo "* Please update your package.json version number."
    exit 1
  fi
}

versionCheck
exit 0
