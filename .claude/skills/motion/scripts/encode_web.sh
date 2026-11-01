#!/usr/bin/env bash
# Two-pass H.264 web cut that lands under a size budget.
#   encode_web.sh master.mp4 out-web.mp4 [target_MB=18.5]
# Bitrate = budget / duration, minus ~3% headroom for the container. A light temporal
# denoise (hqdn3d) stops film grain from eating the bits; colour stays tagged BT.709.
set -euo pipefail
IN=$1; OUT=$2; MB=${3:-18.5}
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
KBPS=$(python3 -c "print(int($MB*8*1000*0.97/$DUR))")
MAX=$((KBPS*19/10)); BUF=$((KBPS*38/10))
LOG=$(mktemp -d)/x264
X="-vf hqdn3d=1:1:3:3 -c:v libx264 -preset veryslow -tune film -b:v ${KBPS}k -maxrate ${MAX}k -bufsize ${BUF}k"
echo "duration ${DUR}s -> ${KBPS} kb/s"
ffmpeg -v error -y -i "$IN" $X -pass 1 -passlogfile "$LOG" -an -f mp4 /dev/null
ffmpeg -v error -y -i "$IN" $X -pass 2 -passlogfile "$LOG" -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -movflags +faststart -an "$OUT"
ls -l "$OUT" | awk '{printf "%s  %.2f MB\n", $NF, $5/1e6}'
