#!/usr/bin/env bash
# Regenerates cloudflare-ips.conf from Cloudflare's published ranges.
# They change occasionally; a stale list means legitimate edge nodes stop being
# trusted and every visitor behind them collapses into one rate-limit bucket.
# run it locally and commit the result
set -euo pipefail
cd "$(dirname "$0")"

OUT=cloudflare-ips.conf
{
  echo "# GENERATED - do not edit by hand."
  echo "# Regenerate with deploy/nginx/refresh-cloudflare-ips.sh"
  echo "#"
  echo "# Tells nginx which sources are allowed to assert CF-Connecting-IP."
  echo "# Without this, real_ip_header would trust the header from anyone."
  echo
  curl -fsS https://www.cloudflare.com/ips-v4 | sed 's/^/set_real_ip_from /; s/$/;/'
  echo
  curl -fsS https://www.cloudflare.com/ips-v6 | sed 's/^/set_real_ip_from /; s/$/;/'
  echo
  echo "real_ip_header CF-Connecting-IP;"
} > "$OUT.tmp"

mv "$OUT.tmp" "$OUT"
echo "wrote $(grep -c set_real_ip_from "$OUT") ranges to $OUT"
echo "now run: sudo nginx -t && sudo systemctl reload nginx"
