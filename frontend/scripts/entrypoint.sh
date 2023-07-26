#!/usr/bin/env bash
set -Ex

function apply_path {

    echo "Check that we have NEXT_PUBLIC_APP_WEB3AUTH_CLIENT_ID vars"
    test -n "$NEXT_PUBLIC_APP_WEB3AUTH_CLIENT_ID"

    find /app/.next \( -type d -name .git -prune \) -o -type f -print0 | xargs -0 sed -i "s#NEXT_PUBLIC_APP_WEB3AUTH_CLIENT_ID#$NEXT_PUBLIC_APP_WEB3AUTH_CLIENT_ID#g"
}

apply_path
echo "Starting Nextjs"
exec "$@"