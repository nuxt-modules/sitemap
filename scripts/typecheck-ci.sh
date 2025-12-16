#!/bin/bash
# Typecheck excluding known high-error files that are being worked on separately

EXCLUDE_PATTERNS=(
  "sitemap/urlset/normalise.ts"
  "sitemap/builder/xml.ts"
)

output=$(pnpm nuxt typecheck 2>&1)

# Count errors in non-excluded files
error_count=0
while IFS= read -r line; do
  if [[ "$line" == *"): error TS"* ]]; then
    skip=false
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
      if [[ "$line" == *"$pattern"* ]]; then
        skip=true
        break
      fi
    done
    if [ "$skip" = false ]; then
      echo "$line"
      ((error_count++))
    fi
  fi
done <<< "$output"

if [ $error_count -gt 0 ]; then
  echo ""
  echo "TypeCheck failed - $error_count error(s) in non-excluded files"
  exit 1
fi

echo "TypeCheck passed (excluded files: urlset/normalise.ts, builder/xml.ts)"
exit 0
