#!/bin/bash
# web.daftaron.uz ga deploy: build -> serverda backup -> dist/ rsync -> 404.html -> tekshiruv
#
#   deploy.sh              # to'liq deploy
#   deploy.sh --dry-run    # build + rsync ro'yxati, serverda hech narsa o'zgarmaydi
#   deploy.sh --skip-build # mavjud dist/ ni yuklash
#
# SSH paroli macOS Keychain'dan (prod-db skill bilan bir xil yozuv: -s hestia -a xurshidbek1)
set -euo pipefail

HOST="xurshidbek1@ruslan.firstcoders.uz"
SITE="web/web.daftaron.uz"
URL="https://web.daftaron.uz"
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

DRY=0; BUILD=1
for a in "$@"; do
    case "$a" in
        --dry-run) DRY=1 ;;
        --skip-build) BUILD=0 ;;
        *) echo "Noma'lum parametr: $a" >&2; exit 2 ;;
    esac
done

if ! security find-generic-password -a xurshidbek1 -s hestia -w >/dev/null 2>&1; then
    echo "Keychain'da parol yo'q. Saqlang: security add-generic-password -a xurshidbek1 -s hestia -w" >&2
    exit 1
fi

# ssh parolni SSH_ASKPASS orqali oladi (sshpass shart emas)
ASKPASS="$(mktemp -t daftaron-askpass)"
trap 'rm -f "$ASKPASS"' EXIT
printf '#!/bin/sh\nexec security find-generic-password -a xurshidbek1 -s hestia -w\n' > "$ASKPASS"
chmod 700 "$ASKPASS"
export SSH_ASKPASS="$ASKPASS" SSH_ASKPASS_REQUIRE=force DISPLAY="${DISPLAY:-:0}"
SSH_OPTS="-o ConnectTimeout=15 -o PreferredAuthentications=password,keyboard-interactive"
remote() { ssh $SSH_OPTS "$HOST" "$@" </dev/null; }

cd "$ROOT"
if [ -n "$(git status --porcelain -- src index.html vite.config.js package.json public)" ]; then
    echo "Ogohlantirish: commit qilinmagan o'zgarishlar bor (build ularni ham oladi)" >&2
fi

if [ "$BUILD" = 1 ]; then
    npm run build
fi
[ -f dist/index.html ] || { echo "dist/index.html yo'q" >&2; exit 1; }
BUNDLE="$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' dist/index.html | head -1)"
echo "Yangi bundle: $BUNDLE"

if [ "$DRY" = 1 ]; then
    rsync -rlzn --itemize-changes -e "ssh $SSH_OPTS" dist/ "$HOST:$SITE/public_html/"
    echo "Dry-run: serverda hech narsa o'zgarmadi"
    exit 0
fi

STAMP="$(date +%Y%m%d-%H%M)"
echo "Backup: ~/$SITE/private/public_html-backup-$STAMP.tar.gz"
remote "cd ~/$SITE && tar czf private/public_html-backup-$STAMP.tar.gz -C public_html ."

# --delete yo'q: eski hashlangan chunk'lar ochiq turgan sahifalar uchun qoladi
rsync -rlz --stats -e "ssh $SSH_OPTS" dist/ "$HOST:$SITE/public_html/" | grep -E 'transferred|Total file size' || true

# nginx'da SPA fallback yo'q: deep link'lar 404.html orqali ilovani ochadi
remote "cp ~/$SITE/public_html/index.html ~/$SITE/document_errors/404.html"

LIVE="$(curl -fsS "$URL/" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1 || true)"
DEEP="$(curl -sS "$URL/debts" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1 || true)"
echo "Jonli /      : ${LIVE:-topilmadi}"
echo "Jonli /debts : ${DEEP:-topilmadi}"
if [ "$LIVE" = "$BUNDLE" ] && [ "$DEEP" = "$BUNDLE" ]; then
    echo "OK: deploy tasdiqlandi"
else
    echo "XATO: jonli bundle dist/ bilan mos emas" >&2
    exit 1
fi
