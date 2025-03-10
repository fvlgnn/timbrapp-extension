#!/bin/sh

# NOTE: Qualità del codice con Super-Linter di GitHub.
# Questo script esegue Super-Linter su una directory specifica.
# Per eseguire lo script, basta digitare il comando sh lint.sh e premere Invio.
# Esempio
# $ sh lint.sh

# Abilita modalità rigorosa
set -e

# Trova la cartella src
if [ -d "$(pwd)/src" ]; then
    SOURCE_DIR="$(pwd)/"
elif [ -d "$(pwd)/../src" ]; then
    SOURCE_DIR="$(pwd)/../"
else
    echo "❌ Errore: Nessuna cartella 'src' trovata nella directory corrente o superiore."
    exit 1
fi

# Rileva il sistema operativo e formatta il percorso di conseguenza
OS_NAME=$(uname -s)
case "$OS_NAME" in
    Linux*)
        SCAN_DIR="$SOURCE_DIR"
        ;;
    MINGW64_NT*|MSYS_NT*)
        # SCAN_DIR=$(echo "$SOURCE_DIR" | sed 's|/c|C:|; s|/|\\|g')
        SCAN_DIR=$(echo "$SOURCE_DIR" | sed -e 's|/c/|C:/|' -e 's|/d/|D:/|' -e 's|/e/|E:/|' -e 's|/f/|F:/|' -e 's|/g/|G:/|' -e 's|/h/|H:/|' -e 's|/|\\|g')
        ;;
    *)
        echo "❌ Errore: Sistema operativo non supportato."
        exit 1
        ;;
esac

echo "✅ Eseguo Super-Linter in: $SCAN_DIR"

# Esegui il linter con i parametri desiderati
docker run --rm \
    -e RUN_LOCAL=true \
    -e LOG_LEVEL=INFO \
    -e VALIDATE_ALL_CODEBASE=true \
    -e DEFAULT_BRANCH=main \
    -e FILTER_REGEX_INCLUDE=".*\.(js|json|html|css|sh)$" \
    -e FILTER_REGEX_EXCLUDE=".*(node_modules|dist|build)/.*|README\.html" \
    -e VALIDATE_JAVASCRIPT_ES=true \
    -e VALIDATE_JSON=true \
    -e VALIDATE_HTML=true \
    -e VALIDATE_CSS=true \
    -e VALIDATE_BASH=true \
    -v "${SCAN_DIR}":/tmp/lint \
    ghcr.io/super-linter/super-linter:slim-v7.3.0
    
