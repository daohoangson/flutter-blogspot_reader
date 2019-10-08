#!/bin/bash

set -e

cd "$( dirname "${BASH_SOURCE[0]}" )"
_dir=$( pwd )

export GOOGLE_APPLICATION_CREDENTIALS="$( dirname ${_dir} )/sa.json"
echo "GOOGLE_APPLICATION_CREDENTIALS=${GOOGLE_APPLICATION_CREDENTIALS}"

if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "${GOOGLE_APPLICATION_CREDENTIALS} not found" >&2
  exit 1
fi
_projectId=$( cat ${GOOGLE_APPLICATION_CREDENTIALS} | jq -r .project_id )
_region=us-central1
echo "_projectId=${_projectId}"

if [ -z "$NGROK_URL" ]; then
  echo 'NGROK_URL env var must be set, run `ngrok http 5000` (or similar) then execute:' >&2
  echo "export NGROK_URL=https://xxx.ngrok.io" >&2
  exit 1
fi
export WEBSUB_URL="${NGROK_URL}/${_projectId}/${_region}/websub"
echo "WEBSUB_URL=${WEBSUB_URL}"

if [ ! -z "$FCM_TOKEN" ]; then
  echo 'Posible tests:'
  echo "curl -v ${NGROK_URL}/${_projectId}/${_region}/subscribe?hub.topic=https://geek.daohoangson.com/feeds/posts/default&br.registration_token=${FCM_TOKEN}"
fi

exec npm run serve
