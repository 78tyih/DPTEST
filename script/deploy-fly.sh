#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

export PATH="/opt/homebrew/bin:$PATH"
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy

exec flyctl deploy "$@"
