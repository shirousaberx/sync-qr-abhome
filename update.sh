#!/bin/bash

# Add NVM to shell configuration
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"  # This loads nvm
fi

# Move to the project directory and run npm command
cd /root/sync-qr-abhome || { echo "Directory not found"; exit 1; }
/root/.nvm/versions/node/v16.20.2/bin/npm run start >> /root/sync-qr-abhome/log.txt 2>&1