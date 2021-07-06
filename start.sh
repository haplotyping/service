#/bin/bash
export HDF5_USE_FILE_LOCKING=FALSE
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
(cd $SCRIPT_DIR && cd src && python server.py)
