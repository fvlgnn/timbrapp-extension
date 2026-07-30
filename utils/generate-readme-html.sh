#!/bin/sh

# NOTE: Genera un file HTML autosufficiente a partire da un file Markdown usando Pandoc
# (https://pandoc.org/installing.html). Lo stile CSS indicato viene incorporato nell'HTML,
# così come l'evidenziazione della sintassi dei blocchi di codice: nessuna dipendenza da CDN.
# Se non si passano argomenti, lo script usa i valori di default (README.md -> src/README.html).
# Esempio
# $ sh utils/generate-readme-html.sh
# $ sh utils/generate-readme-html.sh -i README.md -o src/README.html -s docs/styles/readme-style.css
# $ sh utils/generate-readme-html.sh -i docs/CHANGELOG.md -o /tmp/changelog.html

set -e

# Trova la root del repository (cartella che contiene "src")
if [ -d "$(pwd)/src" ]; then
    ROOT_DIR="$(pwd)"
elif [ -d "$(pwd)/../src" ]; then
    ROOT_DIR="$(cd "$(pwd)/.." && pwd)"
else
    echo "Errore: nessuna cartella 'src' trovata nella directory corrente o superiore."
    exit 1
fi

# Valori di default
INPUT_FILE="$ROOT_DIR/README.md"
OUTPUT_FILE="$ROOT_DIR/src/README.html"
STYLE_FILE="$ROOT_DIR/docs/styles/readme-style.css"
TITLE="TimbrApp Extension"
HIGHLIGHT_STYLE="pygments"

usage() {
    echo "Uso: sh utils/generate-readme-html.sh [-i input.md] [-o output.html] [-s style.css]"
    echo ""
    echo "  -i  File Markdown di input (default: $INPUT_FILE)"
    echo "  -o  File HTML di output    (default: $OUTPUT_FILE)"
    echo "  -s  Foglio di stile CSS da incorporare (default: $STYLE_FILE)"
    echo "  -h  Mostra questo messaggio"
}

while getopts "i:o:s:h" opt; do
    case "$opt" in
        i) INPUT_FILE="$OPTARG" ;;
        o) OUTPUT_FILE="$OPTARG" ;;
        s) STYLE_FILE="$OPTARG" ;;
        h) usage; exit 0 ;;
        *) usage; exit 1 ;;
    esac
done

# Verifica che Pandoc sia installato
if ! command -v pandoc >/dev/null 2>&1; then
    echo "Errore: Pandoc non è installato. Vedi https://pandoc.org/installing.html"
    exit 1
fi

# Verifica che i file richiesti esistano
if [ ! -f "$INPUT_FILE" ]; then
    echo "Errore: file di input non trovato: $INPUT_FILE"
    exit 1
fi

if [ ! -f "$STYLE_FILE" ]; then
    echo "Errore: foglio di stile non trovato: $STYLE_FILE"
    exit 1
fi

echo "Genero $OUTPUT_FILE da $INPUT_FILE (stile: $STYLE_FILE)..."

pandoc "$INPUT_FILE" \
    --from=gfm \
    --standalone \
    --embed-resources \
    --css="$STYLE_FILE" \
    --metadata pagetitle="$TITLE" \
    --highlight-style="$HIGHLIGHT_STYLE" \
    -o "$OUTPUT_FILE"

echo "Fatto: $OUTPUT_FILE"
