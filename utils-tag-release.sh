#!/bin/sh

# NOTE: Questo script semplifica la creazione e l'invio di un tag di rilascio su un repository Git.
# Per eseguire lo script, basta digitare il comando  sh utils-tag-release.sh e premere Invio. 
# Se non si passa alcun argomento, lo script chieder à all'utente di inserire la versione. 
# Se si passa un argomento, lo script lo utilizzerà come versione. 
# Esempio
# $ sh utils-tag-release.sh v1.2.3
# $ sh utils-tag-release.sh

# Funzione per verificare il formato della versione (vX.Y.Z)
validate_version() {
    echo "$1" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$'
}

# Se non viene passato un argomento, chiede all'utente
if [ -z "$1" ]; then
    echo "Inserisci la versione (es. v1.2.3):"
    read VERSION
else
    VERSION=$1
fi

# Verifica il formato della versione
if ! validate_version "$VERSION"; then
    echo "Errore: il formato della versione non è valido! Usa il formato vX.Y.Z (es. v1.2.3)."
    exit 1
fi

# Esegue i comandi git
echo "Creazione del tag $VERSION..."
git tag "$VERSION"

echo "Push del tag su origin..."
git push origin "$VERSION"

echo "Tag $VERSION creato e inviato con successo! 🚀"
    
