#!/bin/sh

# NOTE: Questo script semplifica la cancellazione di un tag.
# Per eseguire lo script, basta digitare il comando  sh utils-tag-delete.sh e premere Invio. 
# Se non si passa alcun argomento, lo script chieder à all'utente di inserire la versione. 
# Se si passa un argomento, lo script lo utilizzerà come versione. 
# Esempio
# $ sh utils-tag-delete.sh v1.2.3
# $ sh utils-tag-delete.sh

# Funzione per verificare il formato della versione (vX.Y.Z)
validate_version() {
    echo "$1" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$'
}

# Se non viene passato un argomento, chiede all'utente
if [ -z "$1" ]; then
    echo "Inserisci la versione (es. v1.2.3):"
    read -r VERSION
else
    VERSION=$1
fi

# Verifica il formato della versione
if ! validate_version "$VERSION"; then
    echo "Errore: il formato della versione non è valido! Usa il formato vX.Y.Z (es. v1.2.3)."
    exit 1
fi

# Esegue i comandi git
echo "Cancellazione locale del tag $VERSION..."
git tag -d "$VERSION"

echo "Cancellazione remota del tag origin..."
git push origin --delete "$VERSION"

echo "Tag $VERSION cancellato. Se collegata una release ricorda di cancellarla sul repository GitHub! 🚀"
    
