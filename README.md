# service

- use `npm` to install packages in the `src/static` directory
- copy or link configuration `src/config_demo.ini` to `src/config.ini` and adjust if necessary
- start service with `start.sh`

This will make a [basic site](http://localhost:5000/) and the [API](http://localhost:5000/api/) available on the configured port.

This service relies on a SQLITE database, marker databases and k-mer databases as can be created with provided [scripts](/haplotyping/scripts).
