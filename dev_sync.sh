#!/bin/bash

SRC_DIR="."

echo "Roosevelt fswatch rsync tool running..."
echo ""
echo "Now watching:" $SRC_DIR/
echo "Will copy to:" $DEST_DIR/node_modules/roosevelt/
echo ""
echo "Make sure the above directories are correct or this could delete unwanted files!"
echo ""

fswatch -0 $SRC_DIR | while read -d "" event
do
  rsync -avz --delete --exclude=.DS_Store "$SRC_DIR/" "$DEST_DIR"/node_modules/roosevelt/
done
