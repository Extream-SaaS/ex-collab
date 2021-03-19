# Components are built and modified by Extream

### Core can be updated from the upstream code provided by OWT if required

A few steps need to be taken to make the ditributed release compatible.

### To build the core

1. Run `docker build -t extreamio/excollab-mediaserver ./src`
2. Then `docker cp extreamio/excollab-mediaserver:/home/owt ./compoents-temp`
3. Carry out a diff between `./components-tmp` and `./components`